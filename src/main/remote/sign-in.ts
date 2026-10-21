import type { IncomingMessage, ServerResponse } from 'node:http';
import { secretsMatch, sessionValueFor } from './access-token';
import { isJsonRequest, readBody, sendEmpty, sendError } from './http-io';
import type { RemoteContext, RemoteCredentials } from './remote-context';
import { readCookie, SESSION_COOKIE, sessionCookieHeader } from './session-cookie';

const MS_PER_SECOND: number = 1000;
// Sign-in is a short JSON object; anything bigger is not one.
const SIGN_IN_BODY_LIMIT: number = 1024;

export function isSignedIn(request: IncomingMessage, credentials: RemoteCredentials): boolean {
  const cookie: string | null = readCookie(request.headers.cookie, SESSION_COOKIE);
  return cookie !== null && credentials.token.length > 0 && secretsMatch(cookie, sessionValueFor(credentials.token));
}

// GET says whether the cookie is still good; POST trades the token for the cookie.
export async function handleSession(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
  const credentials: RemoteCredentials = context.credentials();
  if (request.method === 'GET') return sendEmpty(response, isSignedIn(request, credentials) ? 204 : 401);
  if (request.method !== 'POST') return sendError(response, 405, 'Method not allowed');
  if (!isJsonRequest(request)) return sendError(response, 415, 'Expected JSON');
  const now: number = context.now();
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
  if (token !== null && secretsMatch(token, credentials.token)) {
    return sendEmpty(response, 204, { 'Set-Cookie': sessionCookieHeader(sessionValueFor(credentials.token)) });
  }
  context.limiter.recordFailure(now);
  sendError(response, 401, 'Wrong access token');
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
