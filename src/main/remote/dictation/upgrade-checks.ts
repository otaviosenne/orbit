import type { IncomingMessage } from 'node:http';
import { DICTATION_SOCKET_PATH } from '../../../shared/dictation-protocol';
import type { RemoteCredentials } from '../remote-context';
import { requestPath } from '../request-handler';
import { hasValidSession, isSignedIn } from '../sign-in';
import { isTrustedHost, isTrustedOrigin } from '../trusted-origins';

export interface UpgradeRefusal {
  readonly status: number;
  readonly message: string;
}

const WEBSOCKET_PROTOCOL: string = 'websocket';

// The same gates as every API call, in the same order: Host (DNS rebinding), Origin (a WebSocket is not bound by
// CORS, so this is what stops another site's page from opening one with the user's cookie), then the session cookie.
// Origin is required here: browsers always send it on a WebSocket handshake.
export function upgradeRefusal(request: IncomingMessage, credentials: RemoteCredentials, hasRoom: boolean): UpgradeRefusal | null {
  if (!isTrustedHost(credentials.trusted, request.headers.host)) return { status: 421, message: 'Unknown host' };
  if (requestPath(request) !== DICTATION_SOCKET_PATH) return { status: 404, message: 'Not found' };
  if (!isTrustedOrigin(credentials.trusted, request.headers.origin)) return { status: 403, message: 'Cross-origin request refused' };
  if (request.headers.upgrade?.toLowerCase() !== WEBSOCKET_PROTOCOL) return { status: 400, message: 'Expected a WebSocket' };
  if (!isSignedIn(request, credentials)) return { status: 401, message: 'Sign in first' };
  if (!hasRoom) return { status: 503, message: 'Too many browsers dictating' };
  return null;
}

// What the handshake proved, checked again against the current settings: a new token, another External URL or
// Orbit Web turned off must end a socket that is already open, as they end every cookie.
export function stillAuthorized(request: IncomingMessage, credentials: () => RemoteCredentials): () => boolean {
  const { cookie, origin, host } = request.headers;
  return (): boolean => {
    const current: RemoteCredentials = credentials();
    return isTrustedHost(current.trusted, host) && isTrustedOrigin(current.trusted, origin) && hasValidSession(cookie, current);
  };
}
