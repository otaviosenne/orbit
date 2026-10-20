const MINUTE_MS: number = 60 * 1000;
const HOUR_MS: number = 60 * MINUTE_MS;
const DAY_MS: number = 24 * HOUR_MS;
const WEEK_DAYS: number = 7;
// Past two weeks, "3 weeks ago" reads better than a day count.
const DAYS_BEFORE_WEEKS: number = 14;
const BYTES_PER_UNIT: number = 1024;
const SIZE_UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB'];
// One decimal only while the number is small enough for it to matter ("1.4 MB", "12 MB").
const ONE_DECIMAL_BELOW: number = 10;

export function formatAgo(timestamp: number, now: number): string {
  const elapsed: number = Math.max(0, now - timestamp);
  if (elapsed < MINUTE_MS) return 'just now';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  const days: number = Math.floor(elapsed / DAY_MS);
  if (days < DAYS_BEFORE_WEEKS) return days === 1 ? '1 day ago' : `${days} days ago`;
  return `${Math.floor(days / WEEK_DAYS)} weeks ago`;
}

export function formatSize(bytes: number): string {
  let value: number = Math.max(0, bytes);
  let unit: number = 0;
  while (value >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  const shown: string = unit === 0 || value >= ONE_DECIMAL_BELOW ? String(Math.round(value)) : value.toFixed(1);
  return `${shown} ${SIZE_UNITS[unit]}`;
}
