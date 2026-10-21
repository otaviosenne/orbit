import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// 256 bits: far beyond guessing, even without the rate limit.
const TOKEN_BYTES: number = 32;
const TOKEN_PATTERN: RegExp = /^[A-Za-z0-9_-]{43}$/;
// Names what the cookie value is for, so the same token never signs anything else the same way.
const SESSION_LABEL: string = 'orbit-web-session-v1';

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function isAccessToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

// Hashing first gives both sides the same length, so the comparison takes the same time whatever was sent.
export function secretsMatch(given: string, expected: string): boolean {
  if (expected.length === 0) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

// The cookie carries this rather than the token: it opens nothing else, and a new token voids every cookie at once.
export function sessionValueFor(token: string): string {
  return createHmac('sha256', token).update(SESSION_LABEL).digest('base64url');
}

function digest(text: string): Buffer {
  return createHash('sha256').update(text).digest();
}
