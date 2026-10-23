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

// A week that started fast: the demo's chart shows a reading above the pace line.
const DEMO_HISTORY_POINTS: number = 8;
const DEMO_HISTORY_SPAN_MS: number = 2 * DAY_MS;
const DEMO_HISTORY_END_PERCENT: number = 63;

function demoHistory(now: number): UsageSample[] {
  return Array.from({ length: DEMO_HISTORY_POINTS }, (_unused: unknown, index: number): UsageSample => ({
    at: now - DEMO_HISTORY_SPAN_MS + (DEMO_HISTORY_SPAN_MS * index) / (DEMO_HISTORY_POINTS - 1),
    percent: (DEMO_HISTORY_END_PERCENT * (index + 1)) / DEMO_HISTORY_POINTS,
  }));
}
