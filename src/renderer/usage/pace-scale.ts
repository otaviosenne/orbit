import type { UsageSample } from '../../shared/types';
import { dailySegments, withOffsets, workSegments, type WorkSegment } from './work-schedule';

// What the chart's x axis spans. work: Monday to Friday, 09:00 to 18:00 (the pace the week is planned on). all: every
// hour of the week. used: only the hours the readings show usage going up, so nights and weekends of use show too.
export type PaceScale = 'work' | 'all' | 'used';

export const PACE_SCALES: readonly PaceScale[] = ['work', 'all', 'used'];

const HOUR_MS: number = 60 * 60_000;
const DAY_HOURS: number = 24;
const EVERY_WEEKDAY: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6]);

export function segmentsFor(scale: PaceScale, windowStart: number, windowEnd: number, samples: readonly UsageSample[]): WorkSegment[] {
  if (scale === 'all') return dailySegments(windowStart, windowEnd, { startHour: 0, endHour: DAY_HOURS, weekdays: EVERY_WEEKDAY });
  if (scale === 'used') return usedSegments(windowStart, windowEnd, samples);
  return workSegments(windowStart, windowEnd);
}

// Each hour in which a reading rose over the one before (the week starts from nothing used); hours in a row join
// into one segment.
export function usedSegments(windowStart: number, windowEnd: number, samples: readonly UsageSample[]): WorkSegment[] {
  const hours: Set<number> = new Set();
  let previous: number = 0;
  for (const sample of samples) {
    if (sample.at < windowStart || sample.at > windowEnd) continue;
    if (sample.percent > previous) hours.add(hourStart(sample.at));
    previous = sample.percent;
  }
  return withOffsets(joinHours([...hours].sort((a: number, b: number) => a - b), windowStart, windowEnd));
}

function joinHours(hours: readonly number[], windowStart: number, windowEnd: number): { start: number; end: number }[] {
  const stretches: { start: number; end: number }[] = [];
  for (const hour of hours) {
    const last: { start: number; end: number } | undefined = stretches[stretches.length - 1];
    const end: number = Math.min(hour + HOUR_MS, windowEnd);
    if (last !== undefined && last.end >= hour) last.end = end;
    else stretches.push({ start: Math.max(hour, windowStart), end });
  }
  return stretches;
}

function hourStart(at: number): number {
  const hour: Date = new Date(at);
  hour.setMinutes(0, 0, 0);
  return hour.getTime();
}
