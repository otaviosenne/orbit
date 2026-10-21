import type { Server } from 'node:http';
import type { RemoteSettings } from '../../shared/remote-settings';
import { PAIRING_HASH_KEY } from '../../shared/remote-settings';
import { generateToken } from './access-token';
import { normalizeExternalUrl } from './external-url';
import { FailureLimiter, SIGN_IN_POLICY } from './failure-limiter';
import { pairingQrSvg } from './pairing-qr';
import type { RemoteConfig, RemoteConfigStore } from './remote-config';
import { DEFAULT_REMOTE_CONFIG } from './remote-config';
import type { RemoteCredentials, RemoteRoutes } from './remote-context';
import { closeServer, createRemoteServer, listenLocally, LOOPBACK_HOST } from './remote-server';
import { trustedOrigins } from './trusted-origins';

export interface RemoteControllerOptions {
  readonly store: RemoteConfigStore;
  readonly routes: RemoteRoutes;
  readonly webRoot: string;
  readonly log: (line: string) => void;
}

// Owns Orbit Web's settings and its server: the server runs exactly while the setting is on.
export class RemoteController {
  private config: RemoteConfig = DEFAULT_REMOTE_CONFIG;
  private server: Server | null = null;
  private error: string | null = null;
  // Kept across restarts of the server, so turning it off and on does not reset a lockout.
  private readonly limiter: FailureLimiter = new FailureLimiter(SIGN_IN_POLICY);

  constructor(private readonly options: RemoteControllerOptions) {}

  async start(): Promise<void> {
    this.config = await this.options.store.load();
    if (this.config.enabled) await this.applyEnabled(true);
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
      externalUrl: this.config.externalUrl,
      token: this.config.token,
      pairingUrl,
      pairingQrSvg: pairingUrl === null ? null : pairingQrSvg(pairingUrl),
      error: this.error,
    };
  }

  // The token is made on first enable, so a never-used Orbit Web has no secret lying around.
  async setEnabled(enabled: unknown): Promise<RemoteSettings> {
    if (typeof enabled !== 'boolean') return this.settings();
    const token: string = enabled && this.config.token.length === 0 ? generateToken() : this.config.token;
    await this.update({ ...this.config, enabled, token });
    await this.applyEnabled(enabled);
    return this.settings();
  }

  async setExternalUrl(input: unknown): Promise<RemoteSettings> {
    const externalUrl: string | null = typeof input === 'string' ? normalizeExternalUrl(input) : null;
    if (externalUrl === null) {
      this.error = 'The external URL must be an http(s) address, such as https://orbit.example.com';
      return this.settings();
    }
    this.error = null;
    await this.update({ ...this.config, externalUrl });
    return this.settings();
  }

  // Every cookie is derived from the token, so a new one signs every paired browser out at once.
  async regenerateToken(): Promise<RemoteSettings> {
    await this.update({ ...this.config, token: generateToken() });
    return this.settings();
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
