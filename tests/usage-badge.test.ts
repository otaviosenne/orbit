import { describe, expect, it } from 'vitest';
import type { UsageLimit, UsageSnapshot } from '../src/shared/types';
import { SESSION_LABEL, WEEKLY_ALL_LABEL } from '../src/shared/usage-labels';
import { elapsedPercent, higherLimit } from '../src/renderer/usage/usage-badge';

const HOUR_MS: number = 60 * 60 * 1000;

function snapshot(limits: readonly UsageLimit[]): UsageSnapshot {
  return { limits, breakdown: [], weeklyHistory: [], login: 'signed-in', fetchedAt: 0, error: null };
}

const weekly = (percent: number): UsageLimit => ({ label: WEEKLY_ALL_LABEL, percent, resetsAt: null });
const session = (percent: number): UsageLimit => ({ label: SESSION_LABEL, percent, resetsAt: null });

describe('the percentage in the top bar', () => {
  it('shows the 5-hour session when it is higher than the week', () => {
    expect(higherLimit(snapshot([weekly(7), session(31)]))?.label).toBe(SESSION_LABEL);
  });

  it('shows the week when it is higher, and when they are equal', () => {
    expect(higherLimit(snapshot([session(10), weekly(42)]))?.label).toBe(WEEKLY_ALL_LABEL);
    expect(higherLimit(snapshot([session(20), weekly(20)]))?.label).toBe(WEEKLY_ALL_LABEL);
  });

  it('falls back to whichever limit exists, and to nothing without either', () => {
    expect(higherLimit(snapshot([session(5)]))?.label).toBe(SESSION_LABEL);
    expect(higherLimit(snapshot([weekly(5)]))?.label).toBe(WEEKLY_ALL_LABEL);
    expect(higherLimit(snapshot([]))).toBeNull();
    expect(higherLimit(null)).toBeNull();
  });
});

describe('the even pace of the 5-hour session', () => {
  const NOW: number = 1_000_000_000_000;

  it('is the share of the 5 hours that has passed', () => {
    expect(elapsedPercent(NOW + 4 * HOUR_MS, NOW)).toBeCloseTo(20);
    expect(elapsedPercent(NOW + HOUR_MS / 2, NOW)).toBeCloseTo(90);
  });

  it('stays between 0 and 100 when the reset time is off', () => {
    expect(elapsedPercent(NOW + 9 * HOUR_MS, NOW)).toBe(0);
    expect(elapsedPercent(NOW - HOUR_MS, NOW)).toBe(100);
  });
});
