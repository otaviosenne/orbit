import type { IncomingMessage, ServerResponse } from 'node:http';
import { REMOTE_API_PREFIX, REMOTE_SESSION_PATH } from '../../shared/remote-settings';
import { handleApiCall } from './api-call';
import { applySecurityHeaders, sendError } from './http-io';
import type { RemoteContext, RemoteCredentials } from './remote-context';
import { handleSession } from './sign-in';
import { serveStatic } from './static-files';
import { isTrustedHost, isTrustedOrigin } from './trusted-origins';

const API_ROOT: string = '/api/';
// Only parsed for its path; requests never carry the token in the address.
const PLACEHOLDER_BASE: string = 'http://orbit.invalid';
const READ_METHODS: readonly string[] = ['GET', 'HEAD'];

export function requestPath(request: IncomingMessage): string {
  return new URL(request.url ?? '/', PLACEHOLDER_BASE).pathname;
}

// Host first (DNS rebinding), then Origin (CSRF): writes must come from Orbit Web's own page. No CORS headers exist,
// so no other site can read an answer either.
export async function handleRequest(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
  const credentials: RemoteCredentials = context.credentials();
  applySecurityHeaders(response, credentials.trusted);
  if (!isTrustedHost(credentials.trusted, request.headers.host)) return sendError(response, 421, 'Unknown host');
  if (!isAllowedOrigin(request, credentials)) return sendError(response, 403, 'Cross-origin request refused');
  const path: string = requestPath(request);
  if (path === REMOTE_SESSION_PATH) return handleSession(request, response, context);
  if (path.startsWith(REMOTE_API_PREFIX)) return handleApiCall(request, response, path, context);
  if (path.startsWith(API_ROOT)) return sendError(response, 404, 'Not found');
  if (!READ_METHODS.includes(request.method ?? '')) return sendError(response, 405, 'Method not allowed');
  if (!(await serveStatic(response, context.webRoot, path))) sendError(response, 404, 'Not found');
}

// Browsers always send Origin on writes, so a write without one did not come from a page we served.
function isAllowedOrigin(request: IncomingMessage, credentials: RemoteCredentials): boolean {
  const origin: string | undefined = request.headers.origin;
  if (origin === undefined) return READ_METHODS.includes(request.method ?? '');
  return isTrustedOrigin(credentials.trusted, origin);
}
