import type { UsageSnapshot } from '../shared/types';
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
    fetchedAt: now,
    error: null,
  };
}
