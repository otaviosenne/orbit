import type { Route } from '../../shared/ipc-routing';
import type { RemoteChannel } from '../../shared/remote-access';
import type { FailureLimiter } from './failure-limiter';
import type { TrustedOrigins } from './trusted-origins';

export type RemoteRoutes = Readonly<Record<RemoteChannel, Route>>;

// Read on every request, so a new token or external URL applies without restarting the server.
export interface RemoteCredentials {
  readonly token: string;
  readonly trusted: TrustedOrigins;
}

export interface RemoteContext {
  readonly routes: RemoteRoutes;
  // The folder holding the web app's build (index.html, app.js, web.css, manifest, icons).
  readonly webRoot: string;
  readonly credentials: () => RemoteCredentials;
  readonly limiter: FailureLimiter;
  readonly now: () => number;
  readonly log: (line: string) => void;
}
