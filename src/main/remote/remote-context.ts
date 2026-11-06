import type { Route } from '../../shared/ipc-routing';
import type { RemoteChannel } from '../../shared/remote-access';
import type { DeviceSessions } from './device-sessions';
import type { DictationEngineFactory } from './dictation/dictation-engine';
import type { FailureLimiter } from './failure-limiter';
import type { LegacySessions } from './legacy-session';
import type { PairingCodes } from './pairing-codes';
import type { TrustedOrigins } from './trusted-origins';

export type RemoteRoutes = Readonly<Record<RemoteChannel, Route>>;

// Read on every request, so a new token or external URL applies without restarting the server.
export interface RemoteCredentials {
  readonly token: string;
  readonly trusted: TrustedOrigins;
  // The browsers signed in; a cookie is good while its device is listed here.
  readonly devices: DeviceSessions;
}

export interface RemoteContext {
  readonly routes: RemoteRoutes;
  // The folder holding the web app's build (index.html, app.js, web.css, manifest, icons).
  readonly webRoot: string;
  readonly credentials: () => RemoteCredentials;
  readonly limiter: FailureLimiter;
  // One-time codes a signed-in device made for another one.
  readonly pairing: PairingCodes;
  // Moves browsers still holding the cookie from before devices existed onto a device of their own.
  readonly legacy: LegacySessions;
  // Makes the voice engine for each browser that opens the dictation socket.
  readonly dictation: DictationEngineFactory;
  readonly now: () => number;
  readonly log: (line: string) => void;
}
