import type { UsageSample } from '../shared/types';

// Readings older than this can no longer belong to the current weekly window.
const KEEP_MS: number = 15 * 24 * 60 * 60_000;
// An unchanged percent is kept only now and then, enough to draw a flat stretch without a point per minute.
const UNCHANGED_KEEP_EVERY_MS: number = 30 * 60_000;

// Adds a reading to the series: oldest first, trimmed, and skipping a repeat of the last value.
export function withSample(history: readonly UsageSample[], sample: UsageSample): UsageSample[] {
  const recent: UsageSample[] = history.filter((kept: UsageSample) => sample.at - kept.at < KEEP_MS);
  const last: UsageSample | undefined = recent[recent.length - 1];
  if (last !== undefined && last.percent === sample.percent && sample.at - last.at < UNCHANGED_KEEP_EVERY_MS) return recent;
  return [...recent, sample];
}
