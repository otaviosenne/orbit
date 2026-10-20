import type { TimeSpan } from './types';

const HOUR_MS: number = 60 * 60_000;

// The timeline's widest range; history is never read further back than this.
export const TIMELINE_MAX_HISTORY_MS: number = 6 * HOUR_MS;

// Overlapping or touching spans become one, so a turn reported twice draws as a single stretch.
export function mergeSpans(spans: readonly TimeSpan[]): TimeSpan[] {
  const sorted: TimeSpan[] = [...spans].sort((a: TimeSpan, b: TimeSpan) => a.start - b.start);
  const merged: TimeSpan[] = [];
  for (const span of sorted) {
    const last: TimeSpan | undefined = merged.at(-1);
    if (last !== undefined && span.start <= last.end) merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, span.end) };
    else merged.push(span);
  }
  return merged;
}

// Keeps only the part of each span inside the window; spans entirely outside it are dropped.
export function clipSpans(spans: readonly TimeSpan[], window: TimeSpan): TimeSpan[] {
  return spans
    .map((span: TimeSpan): TimeSpan => ({ start: Math.max(span.start, window.start), end: Math.min(span.end, window.end) }))
    .filter((span: TimeSpan) => span.end > span.start);
}
