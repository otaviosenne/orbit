import type { IncomingMessage, ServerResponse } from 'node:http';
import { secretsMatch, sessionValueFor } from './access-token';
import { deviceNameFrom } from './device-name';
import type { RemoteCredentials } from './remote-context';
import { readCookie, SESSION_COOKIE, sessionCookieHeader, withCookie } from './session-cookie';

// A browser's first requests after Orbit restarts arrive together; the device made for the first one serves the rest
// from the same browser for this long, instead of each making a device of its own.
const REUSE_MS: number = 60_000;

interface Upgrade {
  readonly cookieValue: string;
  readonly at: number;
}

// Before devices existed every browser held the same cookie, derived from the token. Such a cookie still signs in
// while that token is current: the browser becomes a device of its own and gets that device's cookie, so phones
// paired before stay signed in. A new token ends the old cookies for good.
export class LegacySessions {
  // Keyed by User-Agent: the old cookie is the same in every browser, so it cannot tell them apart.
  private readonly recent: Map<string, Upgrade> = new Map();

  upgrade(request: IncomingMessage, response: ServerResponse, credentials: RemoteCredentials, now: number): void {
    const cookieHeader: string | undefined = request.headers.cookie;
    const cookie: string | null = readCookie(cookieHeader, SESSION_COOKIE);
    if (cookieHeader === undefined || cookie === null || !isLegacyCookie(cookie, credentials.token)) return;
    const cookieValue: string = this.deviceCookie(request.headers['user-agent'] ?? '', credentials, now);
    response.setHeader('Set-Cookie', sessionCookieHeader(cookieValue));
    // The rest of this request is checked with the device's cookie, as the browser's next ones will be.
    request.headers.cookie = withCookie(cookieHeader, SESSION_COOKIE, cookieValue);
  }

  private deviceCookie(userAgent: string, credentials: RemoteCredentials, now: number): string {
    const recent: Upgrade | undefined = this.recent.get(userAgent);
    if (recent !== undefined && now - recent.at < REUSE_MS && credentials.devices.verify(recent.cookieValue, now) !== null) return recent.cookieValue;
    const { cookieValue } = credentials.devices.create(deviceNameFrom(userAgent || undefined), now);
    this.recent.set(userAgent, { cookieValue, at: now });
    return cookieValue;
  }
}

function isLegacyCookie(cookie: string, token: string): boolean {
  return token.length > 0 && secretsMatch(cookie, sessionValueFor(token));
}
