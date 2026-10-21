import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isAccessToken } from './access-token';
import { normalizeExternalUrl } from './external-url';

export interface RemoteConfig {
  readonly enabled: boolean;
  readonly port: number;
  // An origin such as https://orbit.example.com, or empty when the user has not set one.
  readonly externalUrl: string;
  // Empty until Orbit Web is first enabled.
  readonly token: string;
}

export const DEFAULT_REMOTE_PORT: number = 4517;
// Below 1024 needs root; above 65535 is no port.
const LOWEST_USER_PORT: number = 1024;
const HIGHEST_PORT: number = 65535;
const CONFIG_FILE: string = 'remote.json';
// The token is as good as a shell on this machine, so only its owner may read the file or list the folder.
const FILE_MODE: number = 0o600;
const DIR_MODE: number = 0o700;
const JSON_INDENT: number = 2;

// Tests and the demo point this elsewhere so they never touch the user's real token.
export const REMOTE_CONFIG_DIR_ENV: string = 'ORBIT_REMOTE_CONFIG_DIR';

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = { enabled: false, port: DEFAULT_REMOTE_PORT, externalUrl: '', token: '' };

// demoDir: the demo keeps its config in its own profile unless the variable says otherwise.
export function remoteConfigDir(env: NodeJS.ProcessEnv, home: string, demoDir: string | null): string {
  const override: string | undefined = env[REMOTE_CONFIG_DIR_ENV];
  if (override !== undefined && override.length > 0) return override;
  if (demoDir !== null) return join(demoDir, 'remote');
  return join(env['XDG_CONFIG_HOME'] ?? join(home, '.config'), 'orbit');
}

// A hand-edited or older file is read field by field; anything unusable falls back on its own.
export function parseRemoteConfig(raw: unknown): RemoteConfig {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_REMOTE_CONFIG;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  return {
    enabled: candidate['enabled'] === true,
    port: isUserPort(candidate['port']) ? candidate['port'] : DEFAULT_REMOTE_PORT,
    externalUrl: typeof candidate['externalUrl'] === 'string' ? (normalizeExternalUrl(candidate['externalUrl']) ?? '') : '',
    token: isAccessToken(candidate['token']) ? candidate['token'] : '',
  };
}

function isUserPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= LOWEST_USER_PORT && value <= HIGHEST_PORT;
}

export class RemoteConfigStore {
  private readonly path: string;

  constructor(private readonly dir: string) {
    this.path = join(dir, CONFIG_FILE);
  }

  async load(): Promise<RemoteConfig> {
    try {
      return parseRemoteConfig(JSON.parse(await readFile(this.path, 'utf8')));
    } catch {
      return DEFAULT_REMOTE_CONFIG;
    }
  }

  // mode only applies when a file or folder is created, so existing ones are tightened with chmod as well.
  async save(config: RemoteConfig): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: DIR_MODE });
    await chmod(this.dir, DIR_MODE);
    await writeFile(this.path, `${JSON.stringify(config, null, JSON_INDENT)}\n`, { mode: FILE_MODE });
    await chmod(this.path, FILE_MODE);
  }
}
