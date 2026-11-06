import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RemoteDevice } from '../../shared/remote-settings';
import { secretsMatch } from './access-token';
import { deviceNameFrom } from './device-name';
import { isJsonRequest, readBody, sendEmpty, sendError } from './http-io';
import type { RemoteContext, RemoteCredentials } from './remote-context';
import { clearedSessionCookieHeader, readCookie, SESSION_COOKIE, sessionCookieHeader } from './session-cookie';

const MS_PER_SECOND: number = 1000;
// Sign-in is a short JSON object; anything bigger is not one.
const SIGN_IN_BODY_LIMIT: number = 1024;

// The device a request's cookie signs in as, or null. A match counts as the device being seen now.
export function sessionDevice(cookieHeader: string | undefined, credentials: RemoteCredentials, now: number = Date.now()): RemoteDevice | null {
  const cookie: string | null = readCookie(cookieHeader, SESSION_COOKIE);
  return cookie === null ? null : credentials.devices.verify(cookie, now);
}

export function isSignedIn(request: IncomingMessage, credentials: RemoteCredentials, now: number = Date.now()): boolean {
  return sessionDevice(request.headers.cookie, credentials, now) !== null;
}

// Also asked again on every dictation message, so a socket of a device signed out on the desktop ends with it.
export function hasValidSession(cookieHeader: string | undefined, credentials: RemoteCredentials): boolean {
  return sessionDevice(cookieHeader, credentials) !== null;
}

// GET says whether the cookie is still good; POST trades the token for a device and its cookie; DELETE signs this
// device out.
export async function handleSession(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
  const credentials: RemoteCredentials = context.credentials();
  const now: number = context.now();
  if (request.method === 'GET') return sendEmpty(response, isSignedIn(request, credentials, now) ? 204 : 401);
  if (request.method === 'DELETE') return signOut(request, response, credentials, now);
  if (request.method !== 'POST') return sendError(response, 405, 'Method not allowed');
  if (!isJsonRequest(request)) return sendError(response, 415, 'Expected JSON');
  if (context.limiter.isLocked(now)) {
    const retryAfter: string = String(Math.ceil(context.limiter.retryAfterMs(now) / MS_PER_SECOND));
    response.setHeader('Retry-After', retryAfter);
    return sendError(response, 429, 'Too many failed sign-ins; try again later');
  }
  let body: string;
  try {
    body = await readBody(request, SIGN_IN_BODY_LIMIT);
  } catch {
    return sendError(response, 413, 'Request body too large');
  }
  const token: string | null = parseToken(body);
  // The access token, or a one-time code another signed-in device made: either signs this device in for good.
  if (token !== null && (secretsMatch(token, credentials.token) || context.pairing.redeem(token, now))) {
    const { cookieValue } = credentials.devices.create(deviceNameFrom(request.headers['user-agent']), now);
    return sendEmpty(response, 204, { 'Set-Cookie': sessionCookieHeader(cookieValue) });
  }
  context.limiter.recordFailure(now);
  sendError(response, 401, 'Wrong access token');
}

// Forgets the device on the computer too, so the cookie is worthless even if the browser kept a copy.
function signOut(request: IncomingMessage, response: ServerResponse, credentials: RemoteCredentials, now: number): void {
  const device: RemoteDevice | null = sessionDevice(request.headers.cookie, credentials, now);
  if (device !== null) credentials.devices.revoke(device.id, now);
  sendEmpty(response, 204, { 'Set-Cookie': clearedSessionCookieHeader() });
}

function parseToken(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    const token: unknown = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>)['token'] : null;
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}
