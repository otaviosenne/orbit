import type { UsageSample } from '../../shared/types';
import { segmentsFor, type PaceScale } from './pace-scale';
import { totalWorkMs, workElapsed, type WorkSegment } from './work-schedule';

export const WEEK_MS: number = 7 * 24 * 60 * 60_000;
const FULL_PERCENT: number = 100;

export interface PacePoint {
  // 0 to 1 across the week's working time.
  readonly x: number;
  readonly percent: number;
}

export interface PaceDay {
  readonly label: string;
  readonly start: number;
  readonly end: number;
}

export interface PaceModel {
  readonly days: readonly PaceDay[];
  readonly actual: readonly PacePoint[];
  // Where the straight line says usage should be right now, and where it really is.
  readonly expectedNow: number;
  readonly actualNow: number | null;
  // A week that is over: its line is whatever it ended at, not a reading to act on.
  readonly isPast: boolean;
  // The even-pace line means something only over a fixed span of time; over the hours of use alone it does not.
  readonly showsPace: boolean;
  // The time the x axis spans, in milliseconds.
  readonly spanMs: number;
}

// The week's chart: the straight line of an even pace against what was really used, both over the scale's time.
export function buildPaceModel(resetsAt: number, samples: readonly UsageSample[], now: number, scale: PaceScale = 'work'): PaceModel {
  const windowStart: number = resetsAt - WEEK_MS;
  const segments: readonly WorkSegment[] = segmentsFor(scale, windowStart, resetsAt, samples);
  const total: number = totalWorkMs(segments);
  const position = (at: number): number => (total === 0 ? 0 : workElapsed(segments, at) / total);
  const inWindow: UsageSample[] = samples.filter((sample: UsageSample) => sample.at >= windowStart && sample.at <= resetsAt);
  const last: UsageSample | undefined = inWindow[inWindow.length - 1];
  return {
    days: daysOf(segments, total),
    actual: inWindow.map((sample: UsageSample): PacePoint => ({ x: position(sample.at), percent: sample.percent })),
    expectedNow: position(Math.min(now, resetsAt)) * FULL_PERCENT,
    actualNow: last === undefined ? null : last.percent,
    isPast: now > resetsAt,
    showsPace: scale !== 'used',
    spanMs: total,
  };
}

// One stretch per calendar day, however many segments it has (the hours of use come in pieces).
function daysOf(segments: readonly WorkSegment[], total: number): PaceDay[] {
  const days: PaceDay[] = [];
  let lastKey: string | null = null;
  for (const segment of segments) {
    const start: number = total === 0 ? 0 : segment.offset / total;
    const end: number = total === 0 ? 0 : (segment.offset + segment.end - segment.start) / total;
    const key: string = new Date(segment.start).toDateString();
    const last: PaceDay | undefined = days[days.length - 1];
    if (last !== undefined && key === lastKey) days[days.length - 1] = { ...last, end };
    else days.push({ label: new Date(segment.start).toLocaleDateString([], { weekday: 'short' }), start, end });
    lastKey = key;
  }
  return days;
}

// Positive when more has been used than an even pace allows.
export function paceGap(model: PaceModel): number | null {
  return model.actualNow === null ? null : model.actualNow - model.expectedNow;
}

export interface PaceReading {
  readonly expected: number;
  // Null where no reading was taken: before the first one or after the last.
  readonly actual: number | null;
  readonly day: string | null;
}

// What both lines say at a point of the week: the even pace and the usage the readings draw there.
export function readingAt(model: PaceModel, fraction: number): PaceReading {
  return {
    expected: fraction * FULL_PERCENT,
    actual: usageAt(model.actual, fraction),
    day: model.days.find((day: PaceDay) => fraction >= day.start && fraction <= day.end)?.label ?? null,
  };
}

function usageAt(points: readonly PacePoint[], fraction: number): number | null {
  const after: number = points.findIndex((point: PacePoint) => point.x >= fraction);
  if (after === -1 || (after === 0 && points[0].x > fraction)) return null;
  const to: PacePoint = points[after];
  const from: PacePoint = points[Math.max(after - 1, 0)];
  if (to.x === from.x) return to.percent;
  return from.percent + ((to.percent - from.percent) * (fraction - from.x)) / (to.x - from.x);
}
