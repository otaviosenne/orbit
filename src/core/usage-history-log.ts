import type { UsageSample } from '../shared/types';

// Past weeks are worth browsing for a long while; only readings this old are dropped.
const KEEP_MS: number = 3 * 365 * 24 * 60 * 60_000;
// How many weeks the Usage page can step back through; the file keeps more than it sends.
const SENT_WEEKS: number = 13;
const WEEK_MS: number = 7 * 24 * 60 * 60_000;
// An unchanged percent is kept only now and then, enough to draw a flat stretch without a point per minute.
const UNCHANGED_KEEP_EVERY_MS: number = 30 * 60_000;

// The readings the Usage page gets: recent weeks only, so a long history does not ride along with every poll.
export function recentSamples(history: readonly UsageSample[], now: number): UsageSample[] {
  return history.filter((sample: UsageSample) => now - sample.at <= SENT_WEEKS * WEEK_MS);
}

// Adds a reading to the series: oldest first, trimmed, and skipping a repeat of the last value.
export function withSample(history: readonly UsageSample[], sample: UsageSample): UsageSample[] {
  const recent: UsageSample[] = history.filter((kept: UsageSample) => sample.at - kept.at < KEEP_MS);
  const last: UsageSample | undefined = recent[recent.length - 1];
  if (last !== undefined && last.percent === sample.percent && sample.at - last.at < UNCHANGED_KEEP_EVERY_MS) return recent;
  return [...recent, sample];
}
