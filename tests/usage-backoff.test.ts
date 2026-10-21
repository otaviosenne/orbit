import { describe, expect, it } from 'vitest';
import { nextUsageDelay } from '../src/core/usage-backoff';

const MINUTE_MS: number = 60_000;

describe('nextUsageDelay', () => {
  it('asks once a minute while things work', () => {
    expect(nextUsageDelay(0, null)).toBe(MINUTE_MS);
  });

  it('doubles after each failure up to fifteen minutes', () => {
    expect(nextUsageDelay(1, null)).toBe(2 * MINUTE_MS);
    expect(nextUsageDelay(3, null)).toBe(8 * MINUTE_MS);
    expect(nextUsageDelay(10, null)).toBe(15 * MINUTE_MS);
  });

  it('follows Retry-After within the same bounds', () => {
    expect(nextUsageDelay(0, 5 * MINUTE_MS)).toBe(5 * MINUTE_MS);
    expect(nextUsageDelay(0, 1000)).toBe(MINUTE_MS);
    expect(nextUsageDelay(0, 60 * MINUTE_MS)).toBe(15 * MINUTE_MS);
  });
});
