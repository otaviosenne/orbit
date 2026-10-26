import { describe, expect, it } from 'vitest';
import { loginStateOf } from '../src/core/login-status';

const NOW: number = 1_000_000;

describe('loginStateOf', () => {
  it('is signed out without a file or a token', () => {
    expect(loginStateOf(null, NOW)).toBe('signed-out');
    expect(loginStateOf({ claudeAiOauth: {} }, NOW)).toBe('signed-out');
  });

  it('is signed in with a token, even one past its own expiry that Claude Code renews', () => {
    expect(loginStateOf({ claudeAiOauth: { accessToken: 'x' } }, NOW)).toBe('signed-in');
  });

  it('is signed out once the refresh token itself has expired', () => {
    expect(loginStateOf({ claudeAiOauth: { accessToken: 'x', refreshTokenExpiresAt: NOW - 1 } }, NOW)).toBe('signed-out');
    expect(loginStateOf({ claudeAiOauth: { accessToken: 'x', refreshTokenExpiresAt: NOW + 1 } }, NOW)).toBe('signed-in');
  });
});
