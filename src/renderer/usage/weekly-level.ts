export type WeeklyLevel = 'calm' | 'warning' | 'critical' | 'exhausted';

// Where the weekly limit starts to call for care, then for stopping, then is nearly gone (percent used).
const WARNING_PERCENT: number = 50;
const CRITICAL_PERCENT: number = 80;
const EXHAUSTED_PERCENT: number = 90;

export function weeklyLevel(percent: number): WeeklyLevel {
  if (percent >= EXHAUSTED_PERCENT) return 'exhausted';
  if (percent >= CRITICAL_PERCENT) return 'critical';
  if (percent >= WARNING_PERCENT) return 'warning';
  return 'calm';
}
