import type { UsageSample, UsageSnapshot } from '../shared/types';
import { DAY_MS, HOUR_MS, MINUTE_MS } from './demo-clock';

const SESSION_RESET_MS: number = 2 * HOUR_MS + 14 * MINUTE_MS;
const WEEK_RESET_MS: number = 3 * DAY_MS + 5 * HOUR_MS;

export function demoUsage(now: number): UsageSnapshot {
  return {
    limits: [
      { label: 'Current session', percent: 42, resetsAt: now + SESSION_RESET_MS },
      { label: 'This week, all models', percent: 63, resetsAt: now + WEEK_RESET_MS },
      { label: 'This week, Opus', percent: 84, resetsAt: now + WEEK_RESET_MS },
    ],
    breakdown: [
      { label: 'Opus', percent: 71 },
      { label: 'Sonnet', percent: 24 },
      { label: 'Haiku', percent: 5 },
    ],
    weeklyHistory: demoHistory(now),
    fetchedAt: now,
    error: null,
  };
}

// Two weeks of readings: last week ended high, this one is partway and above an even pace, so both chart views have data.
const DEMO_WEEK_MS: number = 7 * DAY_MS;
const DEMO_POINTS_PER_WEEK: number = 10;
const DEMO_THIS_WEEK_PERCENT: number = 63;
const DEMO_LAST_WEEK_PERCENT: number = 91;
const DEMO_THIS_WEEK_ELAPSED_MS: number = DEMO_WEEK_MS - WEEK_RESET_MS;

function demoHistory(now: number): UsageSample[] {
  const lastWeek: UsageSample[] = rampOver(now - DEMO_THIS_WEEK_ELAPSED_MS - DEMO_WEEK_MS, DEMO_WEEK_MS - HOUR_MS, DEMO_LAST_WEEK_PERCENT);
  return [...lastWeek, ...rampOver(now - DEMO_THIS_WEEK_ELAPSED_MS + HOUR_MS, DEMO_THIS_WEEK_ELAPSED_MS - HOUR_MS, DEMO_THIS_WEEK_PERCENT)];
}

function rampOver(start: number, span: number, endPercent: number): UsageSample[] {
  return Array.from({ length: DEMO_POINTS_PER_WEEK }, (_unused: unknown, index: number): UsageSample => ({
    at: start + (span * index) / (DEMO_POINTS_PER_WEEK - 1),
    percent: (endPercent * (index + 1)) / DEMO_POINTS_PER_WEEK,
  }));
}
