export type TimelineRange = '1h' | '2h' | '3h' | '6h';

export const TIMELINE_RANGES: readonly TimelineRange[] = ['1h', '2h', '3h', '6h'];

interface RangeScale {
  readonly historyMs: number;
  readonly tickMs: number;
}

const MINUTE_MS: number = 60_000;
const HOUR_MS: number = 60 * MINUTE_MS;
const STORAGE_KEY: string = 'orbit.timeline-range';
const DEFAULT_RANGE: TimelineRange = '1h';

// Tick spacing grows with the range so the axis keeps roughly the same number of readable labels.
const RANGE_SCALES: Readonly<Record<TimelineRange, RangeScale>> = {
  '1h': { historyMs: HOUR_MS, tickMs: 10 * MINUTE_MS },
  '2h': { historyMs: 2 * HOUR_MS, tickMs: 15 * MINUTE_MS },
  '3h': { historyMs: 3 * HOUR_MS, tickMs: 30 * MINUTE_MS },
  '6h': { historyMs: 6 * HOUR_MS, tickMs: HOUR_MS },
};

export function rangeHistoryMs(range: TimelineRange): number {
  return RANGE_SCALES[range].historyMs;
}

export function rangeTickMs(range: TimelineRange): number {
  return RANGE_SCALES[range].tickMs;
}

export function isTimelineRange(value: string): value is TimelineRange {
  return (TIMELINE_RANGES as readonly string[]).includes(value);
}

export function parseTimelineRange(saved: string | null): TimelineRange {
  return saved !== null && isTimelineRange(saved) ? saved : DEFAULT_RANGE;
}

export function loadTimelineRange(): TimelineRange {
  try {
    return parseTimelineRange(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_RANGE;
  }
}

export function saveTimelineRange(range: TimelineRange): void {
  try {
    localStorage.setItem(STORAGE_KEY, range);
  } catch {
    // The range still applies for this run.
  }
}
