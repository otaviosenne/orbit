import type { Server } from 'node:http';
import type { RemoteSettings } from '../../shared/remote-settings';
import { PAIRING_HASH_KEY } from '../../shared/remote-settings';
import { generateToken } from './access-token';
import type { DictationEngineFactory } from './dictation/dictation-engine';
import { normalizeExternalUrl } from './external-url';
import { FailureLimiter, SIGN_IN_POLICY } from './failure-limiter';
import { pairingQrSvg } from './pairing-qr';
import type { RemoteConfig, RemoteConfigStore } from './remote-config';
import { DEFAULT_REMOTE_CONFIG, isUserPort } from './remote-config';
import type { RemoteCredentials, RemoteRoutes } from './remote-context';
import { closeServer, createRemoteServer, dropDictationClients, listenLocally, LOOPBACK_HOST } from './remote-server';
import { trustedOrigins } from './trusted-origins';

export interface RemoteControllerOptions {
  readonly store: RemoteConfigStore;
  readonly routes: RemoteRoutes;
  readonly webRoot: string;
  readonly dictation: DictationEngineFactory;
  readonly log: (line: string) => void;
}

// Owns Orbit Web's settings and its server: the server runs exactly while the setting is on.
export class RemoteController {
  private config: RemoteConfig = DEFAULT_REMOTE_CONFIG;
  private server: Server | null = null;
  private error: string | null = null;
  // Kept across restarts of the server, so turning it off and on does not reset a lockout.
  private readonly limiter: FailureLimiter = new FailureLimiter(SIGN_IN_POLICY);
  // Changes run one at a time: an "off" arriving while "on" still binds the port must wait for it, or the server
  // would end up listening with the setting off.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: RemoteControllerOptions) {}

  start(): Promise<void> {
    return this.serialize(async (): Promise<void> => {
      this.config = await this.options.store.load();
      if (this.config.enabled) await this.applyEnabled(true);
    });
  }

  async stop(): Promise<void> {
    const server: Server | null = this.server;
    this.server = null;
    if (server !== null) await closeServer(server);
  }

  settings(): RemoteSettings {
    const localUrl: string = `http://${LOOPBACK_HOST}:${this.config.port}`;
    const pairingUrl: string | null =
      this.config.externalUrl.length > 0 && this.config.token.length > 0 ? `${this.config.externalUrl}/#${PAIRING_HASH_KEY}=${this.config.token}` : null;
    return {
      enabled: this.config.enabled,
      running: this.server !== null,
      localUrl,
      port: this.config.port,
      externalUrl: this.config.externalUrl,
      token: this.config.token,
      pairingUrl,
      pairingQrSvg: pairingUrl === null ? null : pairingQrSvg(pairingUrl),
      error: this.error,
    };
  }

  // The token is made on first enable, so a never-used Orbit Web has no secret lying around.
  setEnabled(enabled: unknown): Promise<RemoteSettings> {
    return this.serialize(async (): Promise<RemoteSettings> => {
      if (typeof enabled !== 'boolean') return this.settings();
      const token: string = enabled && this.config.token.length === 0 ? generateToken() : this.config.token;
      await this.update({ ...this.config, enabled, token });
      await this.applyEnabled(enabled);
      return this.settings();
    });
  }

  setExternalUrl(input: unknown): Promise<RemoteSettings> {
    return this.serialize(async (): Promise<RemoteSettings> => {
      const externalUrl: string | null = typeof input === 'string' ? normalizeExternalUrl(input) : null;
      if (externalUrl === null) {
        this.error = 'The external URL must be an http(s) address, such as https://orbit.example.com';
        return this.settings();
      }
      this.error = null;
      await this.update({ ...this.config, externalUrl });
      this.dropDictation();
      return this.settings();
    });
  }

  // A running server moves to the new port at once; phones keep working once the tunnel points there too.
  setPort(input: unknown): Promise<RemoteSettings> {
    return this.serialize(async (): Promise<RemoteSettings> => {
      const port: number = typeof input === 'string' ? Number(input) : Number.NaN;
      if (!isUserPort(port)) {
        this.error = 'The port must be a whole number from 1024 to 65535';
        return this.settings();
      }
      this.error = null;
      if (port === this.config.port) return this.settings();
      await this.update({ ...this.config, port });
      if (this.config.enabled) await this.applyEnabled(true);
      return this.settings();
    });
  }

  // Every cookie is derived from the token, so a new one signs every paired browser out at once.
  regenerateToken(): Promise<RemoteSettings> {
    return this.serialize(async (): Promise<RemoteSettings> => {
      await this.update({ ...this.config, token: generateToken() });
      this.dropDictation();
      return this.settings();
    });
  }

  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result: Promise<T> = this.queue.then(work, work);
    this.queue = result.catch((): void => undefined);
    return result;
  }

  // An open dictation socket proved the old token or address; it must not outlive them.
  private dropDictation(): void {
    if (this.server !== null) dropDictationClients(this.server);
  }

  private credentials(): RemoteCredentials {
    return { token: this.config.token, trusted: trustedOrigins(this.config.port, this.config.externalUrl) };
  }

  private async update(next: RemoteConfig): Promise<void> {
    await this.options.store.save(next);
    this.config = next;
  }

  private async applyEnabled(enabled: boolean): Promise<void> {
    await this.stop();
    if (!enabled) return void (this.error = null);
    const server: Server = createRemoteServer({
      routes: this.options.routes,
      webRoot: this.options.webRoot,
      credentials: (): RemoteCredentials => this.credentials(),
      limiter: this.limiter,
      dictation: this.options.dictation,
      now: (): number => Date.now(),
      log: this.options.log,
    });
    try {
      await listenLocally(server, this.config.port);
      this.server = server;
      this.error = null;
    } catch (error: unknown) {
      this.error = `Could not listen on ${LOOPBACK_HOST}:${this.config.port}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
