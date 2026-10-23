export type WeeklyLevel = 'low' | 'ok' | 'warning' | 'critical' | 'exhausted';

const FULL_PERCENT: number = 100;
// Below the even pace the score is how much of the pace is unused; above it, how much of the room left over the pace
// is used. These are the scores where each color starts.
const LOW_BELOW: number = -0.25;
const WARNING_FROM: number = 0.15;
const CRITICAL_FROM: number = 0.4;
const EXHAUSTED_FROM: number = 0.75;

// Proportional, not a fixed number of points: with 90% expected, 95% used has eaten half of the 10 points of room and
// 99% nearly all of it, while with 10% expected the same five points over are almost nothing.
export function paceScore(used: number, expected: number): number {
  if (used >= expected) {
    const room: number = FULL_PERCENT - expected;
    return room <= 0 ? (used >= FULL_PERCENT ? 1 : 0) : (used - expected) / room;
  }
  return -(expected - used) / expected;
}

export function weeklyLevel(used: number, expected: number): WeeklyLevel {
  const score: number = paceScore(used, expected);
  if (score >= EXHAUSTED_FROM) return 'exhausted';
  if (score >= CRITICAL_FROM) return 'critical';
  if (score >= WARNING_FROM) return 'warning';
  return score <= LOW_BELOW ? 'low' : 'ok';
}
