export const SESSION_COOKIE: string = 'orbit_session';
// A month: the phone stays signed in between trips, and a new token signs it out whenever needed.
const MAX_AGE_SECONDS: number = 30 * 24 * 60 * 60;

// HttpOnly keeps it from page scripts, Secure from plain-HTTP networks, SameSite=Strict from other sites' requests.
export function sessionCookieHeader(value: string): string {
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) return null;
  for (const part of header.split(';')) {
    const separator: number = part.indexOf('=');
    if (separator !== -1 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}
