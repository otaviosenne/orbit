import { describe, expect, it } from 'vitest';
import type { UsageLimit, UsageSnapshot } from '../src/shared/types';
import { SESSION_LABEL, WEEKLY_ALL_LABEL } from '../src/shared/usage-labels';
import { elapsedPercent, worseLimit } from '../src/renderer/usage/usage-badge';

const HOUR_MS: number = 60 * 60 * 1000;
// A Wednesday at 13:00, local time: well inside the working week.
const NOW: number = new Date(2026, 9, 28, 13).getTime();
const WEEK_MS: number = 7 * 24 * HOUR_MS;

function snapshot(limits: readonly UsageLimit[]): UsageSnapshot {
  return { limits, breakdown: [], weeklyHistory: [], login: 'signed-in', fetchedAt: 0, error: null };
}

const weekly = (percent: number): UsageLimit => ({ label: WEEKLY_ALL_LABEL, percent, resetsAt: null });
const session = (percent: number): UsageLimit => ({ label: SESSION_LABEL, percent, resetsAt: null });

describe('the percentage in the top bar without reset times', () => {
  it('shows the 5-hour session when it is higher than the week', () => {
    expect(worseLimit(snapshot([weekly(7), session(31)]), NOW)?.label).toBe(SESSION_LABEL);
  });

  it('shows the week when it is higher, and when they are equal', () => {
    expect(worseLimit(snapshot([session(10), weekly(42)]), NOW)?.label).toBe(WEEKLY_ALL_LABEL);
    expect(worseLimit(snapshot([session(20), weekly(20)]), NOW)?.label).toBe(WEEKLY_ALL_LABEL);
  });

  it('falls back to whichever limit exists, and to nothing without either', () => {
    expect(worseLimit(snapshot([session(5)]), NOW)?.label).toBe(SESSION_LABEL);
    expect(worseLimit(snapshot([weekly(5)]), NOW)?.label).toBe(WEEKLY_ALL_LABEL);
    expect(worseLimit(snapshot([]), NOW)).toBeNull();
    expect(worseLimit(null, NOW)).toBeNull();
  });
});

describe('the percentage in the top bar with reset times', () => {
  // Resets on Sunday at 01:00, so 22 of the week's 45 working hours have passed: an even pace is about 49%.
  const pacedWeekly = (percent: number): UsageLimit => ({ label: WEEKLY_ALL_LABEL, percent, resetsAt: NOW + WEEK_MS / 2 });
  // Resets in 1 hour, so 80% of the 5 hours has passed.
  const pacedSession = (percent: number): UsageLimit => ({ label: SESSION_LABEL, percent, resetsAt: NOW + HOUR_MS });

  it('shows the week when it is over its pace although the session is higher', () => {
    expect(worseLimit(snapshot([pacedWeekly(70), pacedSession(85)]), NOW)?.label).toBe(WEEKLY_ALL_LABEL);
  });

  it('shows the session when it is the one further over its pace', () => {
    expect(worseLimit(snapshot([pacedWeekly(40), pacedSession(95)]), NOW)?.label).toBe(SESSION_LABEL);
  });
});

describe('the even pace of the 5-hour session', () => {

  it('is the share of the 5 hours that has passed', () => {
    expect(elapsedPercent(NOW + 4 * HOUR_MS, NOW)).toBeCloseTo(20);
    expect(elapsedPercent(NOW + HOUR_MS / 2, NOW)).toBeCloseTo(90);
  });

  it('stays between 0 and 100 when the reset time is off', () => {
    expect(elapsedPercent(NOW + 9 * HOUR_MS, NOW)).toBe(0);
    expect(elapsedPercent(NOW - HOUR_MS, NOW)).toBe(100);
  });
});
