import { describe, expect, it } from 'vitest';
import { recentSamples, withSample } from '../src/core/usage-history-log';
import { buildPaceModel, paceGap, readingAt } from '../src/renderer/usage/pace-model';
import { totalWorkMs, workElapsed, workSegments, type WorkSegment } from '../src/renderer/usage/work-schedule';

const HOUR: number = 3_600_000;
// A week that resets Monday 26 Oct 2026 at 17:00, so it runs Tuesday to the next Monday in working days.
const RESETS_AT: number = new Date(2026, 9, 26, 17).getTime();
const WINDOW_START: number = RESETS_AT - 7 * 24 * HOUR;
const at = (day: number, hour: number): number => new Date(2026, 9, day, hour).getTime();

describe('work schedule', () => {
  const segments: WorkSegment[] = workSegments(WINDOW_START, RESETS_AT);

  it('has five working days of eight hours and skips the weekend', () => {
    expect(segments).toHaveLength(5);
    expect(totalWorkMs(segments)).toBe(40 * HOUR);
  });

  it('counts working time inside a day', () => {
    expect(workElapsed(segments, at(20, 13))).toBe(4 * HOUR);
    expect(workElapsed(segments, at(21, 9))).toBe(8 * HOUR);
  });

  it('counts a Sunday prompt at the start of Monday and a Saturday one at the end of Friday', () => {
    expect(workElapsed(segments, at(25, 15))).toBe(32 * HOUR);
    expect(workElapsed(segments, at(24, 12))).toBe(32 * HOUR);
  });

  it('puts a late evening on the end of that day and an early morning on the start of the next', () => {
    expect(workElapsed(segments, at(20, 21))).toBe(8 * HOUR);
    expect(workElapsed(segments, at(21, 6))).toBe(8 * HOUR);
    expect(workElapsed(segments, at(20, 18))).toBe(8 * HOUR);
  });
});

describe('pace model', () => {
  it('reads halfway through the week as 50% of an even pace', () => {
    const model = buildPaceModel(RESETS_AT, [{ at: at(22, 13), percent: 70 }], at(22, 13));
    expect(model.expectedNow).toBe(50);
    expect(paceGap(model)).toBe(20);
    expect(model.days).toHaveLength(5);
  });

  it('has no gap before any reading and ignores readings from other weeks', () => {
    const model = buildPaceModel(RESETS_AT, [{ at: WINDOW_START - HOUR, percent: 90 }], at(21, 9));
    expect(paceGap(model)).toBeNull();
    expect(model.actual).toEqual([]);
  });
});

describe('hover reading', () => {
  it('gives the even pace and the interpolated usage at a point of the week', () => {
    const model = buildPaceModel(RESETS_AT, [{ at: at(20, 9), percent: 0 }, { at: at(21, 9), percent: 20 }], at(21, 9));
    const reading = readingAt(model, 0.1);
    expect(reading.expected).toBeCloseTo(10);
    expect(reading.actual).toBeCloseTo(10);
    expect(reading.day).toBe(model.days[0].label);
  });

  it('has no usage before the first reading or after the last', () => {
    const model = buildPaceModel(RESETS_AT, [{ at: at(21, 9), percent: 20 }], at(21, 9));
    expect(readingAt(model, 0.05).actual).toBeNull();
    expect(readingAt(model, 0.9).actual).toBeNull();
  });
});

describe('past weeks', () => {
  it('marks a finished week and ends its even pace at 100%', () => {
    const lastWeekEnd: number = RESETS_AT - 7 * 24 * HOUR;
    const model = buildPaceModel(lastWeekEnd, [{ at: lastWeekEnd - 2 * HOUR, percent: 87 }], RESETS_AT);
    expect(model.isPast).toBe(true);
    expect(model.expectedNow).toBe(100);
    expect(model.actualNow).toBe(87);
  });
});

describe('usage history log', () => {
  it('keeps old weeks on disk but sends only the recent ones to the page', () => {
    const now: number = RESETS_AT;
    const history = [{ at: now - 200 * 24 * HOUR, percent: 5 }, { at: now - 10 * 24 * HOUR, percent: 40 }];
    expect(recentSamples(history, now).map((sample) => sample.percent)).toEqual([40]);
    expect(withSample(history, { at: now, percent: 41 })).toHaveLength(3);
  });

  it('skips an unchanged reading soon after the last one but keeps a changed one', () => {
    const first = withSample([], { at: 1_000, percent: 10 });
    expect(withSample(first, { at: 2_000, percent: 10 })).toHaveLength(1);
    expect(withSample(first, { at: 2_000, percent: 11 })).toHaveLength(2);
  });
});
