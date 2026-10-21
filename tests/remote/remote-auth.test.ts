import { describe, expect, it } from 'vitest';
import { generateToken, isAccessToken, secretsMatch, sessionValueFor } from '../../src/main/remote/access-token';
import { FailureLimiter } from '../../src/main/remote/failure-limiter';
import type { LimiterPolicy } from '../../src/main/remote/failure-limiter';
import { readCookie, sessionCookieHeader } from '../../src/main/remote/session-cookie';

describe('access token', () => {
  it('generates long random tokens in the stored format', () => {
    const first: string = generateToken();
    expect(isAccessToken(first)).toBe(true);
    expect(generateToken()).not.toBe(first);
  });

  it('matches only the exact token, and never an empty expected one', () => {
    const token: string = generateToken();
    expect(secretsMatch(token, token)).toBe(true);
    expect(secretsMatch(`${token}x`, token)).toBe(false);
    expect(secretsMatch(token.slice(1), token)).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
  });

  it('derives a cookie value that is not the token and changes with it', () => {
    const token: string = generateToken();
    expect(sessionValueFor(token)).not.toContain(token);
    expect(sessionValueFor(token)).toBe(sessionValueFor(token));
    expect(sessionValueFor(generateToken())).not.toBe(sessionValueFor(token));
  });
});

describe('FailureLimiter', () => {
  const policy: LimiterPolicy = { maxFailures: 3, windowMs: 1000, lockoutMs: 5000 };

  it('locks after too many failures inside the window, then unlocks', () => {
    const limiter: FailureLimiter = new FailureLimiter(policy);
    limiter.recordFailure(0);
    limiter.recordFailure(100);
    expect(limiter.isLocked(200)).toBe(false);
    limiter.recordFailure(200);
    expect(limiter.isLocked(300)).toBe(true);
    expect(limiter.retryAfterMs(300)).toBe(4900);
    expect(limiter.isLocked(5200)).toBe(false);
  });

  it('forgets failures older than the window', () => {
    const limiter: FailureLimiter = new FailureLimiter(policy);
    limiter.recordFailure(0);
    limiter.recordFailure(100);
    limiter.recordFailure(1500);
    expect(limiter.isLocked(1600)).toBe(false);
  });
});

describe('session cookie', () => {
  it('is HttpOnly, Secure and SameSite=Strict', () => {
    const header: string = sessionCookieHeader('abc');
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) expect(header).toContain(attribute);
  });

  it('reads one cookie out of a header', () => {
    expect(readCookie('a=1; orbit_session=xyz; b=2', 'orbit_session')).toBe('xyz');
    expect(readCookie('a=1', 'orbit_session')).toBeNull();
    expect(readCookie(undefined, 'orbit_session')).toBeNull();
  });
});
