export const SESSION_COOKIE: string = 'orbit_session';
// A month: the phone stays signed in between trips, and the desktop's device list signs it out whenever needed.
const MAX_AGE_SECONDS: number = 30 * 24 * 60 * 60;
const COOKIE_ATTRIBUTES: string = 'HttpOnly; Secure; SameSite=Strict; Path=/';

// HttpOnly keeps it from page scripts, Secure from plain-HTTP networks, SameSite=Strict from other sites' requests.
export function sessionCookieHeader(value: string): string {
  return `${SESSION_COOKIE}=${value}; ${COOKIE_ATTRIBUTES}; Max-Age=${MAX_AGE_SECONDS}`;
}

// Tells the browser to drop the cookie at once.
export function clearedSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0`;
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) return null;
  for (const part of header.split(';')) {
    const separator: number = part.indexOf('=');
    if (separator !== -1 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

// The header with one cookie's value swapped, the others left as they were.
export function withCookie(header: string, name: string, value: string): string {
  return header
    .split(';')
    .map((part: string): string => (part.slice(0, part.indexOf('=')).trim() === name ? ` ${name}=${value}` : part))
    .join(';')
    .trim();
}
