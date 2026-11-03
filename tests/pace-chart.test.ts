import { describe, expect, it } from 'vitest';
import { recentSamples, withSample } from '../src/core/usage-history-log';
import { buildPaceModel, momentAt, paceGap, readingAt } from '../src/renderer/usage/pace-model';
import { totalWorkMs, workElapsed, workSegments, type WorkSegment } from '../src/renderer/usage/work-schedule';
import { GRID_PERCENTS } from '../src/renderer/usage/pace-chart';
import { segmentsFor, usedSegments } from '../src/renderer/usage/pace-scale';

const HOUR: number = 3_600_000;
// A week that resets Monday 26 Oct 2026 at 20:00, after the working day ends at 18:00; it runs Tuesday to the next
// Monday in working days.
const RESETS_AT: number = new Date(2026, 9, 26, 20).getTime();
const WORK_DAY_HOURS: number = 9;
const WINDOW_START: number = RESETS_AT - 7 * 24 * HOUR;
// Hours may be fractional (13.5 is half past one).
const at = (day: number, hour: number): number => new Date(2026, 9, day, 0, hour * 60).getTime();

describe('work schedule', () => {
  const segments: WorkSegment[] = workSegments(WINDOW_START, RESETS_AT);

  it('has five working days of nine hours and skips the weekend', () => {
    expect(segments).toHaveLength(5);
    expect(totalWorkMs(segments)).toBe(5 * WORK_DAY_HOURS * HOUR);
  });

  it('counts working time inside a day', () => {
    expect(workElapsed(segments, at(20, 13))).toBe(4 * HOUR);
    expect(workElapsed(segments, at(21, 9))).toBe(WORK_DAY_HOURS * HOUR);
  });

  it('counts a Sunday prompt at the start of Monday and a Saturday one at the end of Friday', () => {
    expect(workElapsed(segments, at(25, 15))).toBe(4 * WORK_DAY_HOURS * HOUR);
    expect(workElapsed(segments, at(24, 12))).toBe(4 * WORK_DAY_HOURS * HOUR);
  });

  it('puts a late evening on the end of that day and an early morning on the start of the next', () => {
    expect(workElapsed(segments, at(20, 21))).toBe(WORK_DAY_HOURS * HOUR);
    expect(workElapsed(segments, at(21, 6))).toBe(WORK_DAY_HOURS * HOUR);
    expect(workElapsed(segments, at(20, 18))).toBe(WORK_DAY_HOURS * HOUR);
  });

  it('ends the last day at 18:00 although the week resets at 20:00', () => {
    const last: WorkSegment = segments[segments.length - 1];
    expect(last.end).toBe(at(26, 18));
    expect(workElapsed(segments, at(26, 17))).toBeLessThan(totalWorkMs(segments));
    expect(workElapsed(segments, at(26, 19))).toBe(totalWorkMs(segments));
  });
});

describe('pace model', () => {
  it('reads halfway through the week as 50% of an even pace', () => {
    const model = buildPaceModel(RESETS_AT, [{ at: at(22, 13.5), percent: 70 }], at(22, 13.5));
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

describe('the chart grid', () => {
  it('has a line for every working day, 20% apart', () => {
    expect(GRID_PERCENTS).toEqual([0, 20, 40, 60, 80, 100]);
  });
});

describe('pace scales', () => {
  // Readings rising at 21:10 and 21:40 on Tuesday night, flat at 22:20, rising at 23:05, and on Saturday at 10:30.
  const samples = [
    { at: at(20, 21 + 10 / 60), percent: 4 },
    { at: at(20, 21 + 40 / 60), percent: 6 },
    { at: at(20, 22 + 20 / 60), percent: 6 },
    { at: at(20, 23 + 5 / 60), percent: 9 },
    { at: at(24, 10.5), percent: 12 },
  ];

  it('spans every hour of the week on the whole-week scale', () => {
    const segments: WorkSegment[] = segmentsFor('all', WINDOW_START, RESETS_AT, samples);
    expect(totalWorkMs(segments)).toBe(7 * 24 * HOUR);
  });

  it('keeps only the hours usage went up, joining hours in a row', () => {
    const segments: WorkSegment[] = usedSegments(WINDOW_START, RESETS_AT, samples);
    expect(segments.map((segment: WorkSegment) => [segment.start, segment.end])).toEqual([
      [at(20, 21), at(20, 22)],
      [at(20, 23), at(21, 0)],
      [at(24, 10), at(24, 11)],
    ]);
    expect(totalWorkMs(segments)).toBe(3 * HOUR);
  });

  it('draws no even pace over the hours of use and names each day once', () => {
    const model = buildPaceModel(RESETS_AT, samples, at(24, 12), 'used');
    expect(model.showsPace).toBe(false);
    expect(model.spanMs).toBe(3 * HOUR);
    expect(model.days.map((day) => day.label)).toHaveLength(2);
    expect(model.actualNow).toBe(12);
    expect(buildPaceModel(RESETS_AT, samples, at(24, 12)).showsPace).toBe(true);
  });
});

describe('the moment under the pointer', () => {
  it('walks the axis back to the clock, skipping nights and weekends on the work scale', () => {
    const model = buildPaceModel(RESETS_AT, [], at(22, 12));
    // Tuesday 09:00 to 18:00 is the first working day; a quarter of five working days is one and a quarter days in.
    expect(momentAt(model, 0)).toBe(at(20, 9));
    expect(momentAt(model, 1 / 5 / 2)).toBe(at(20, 13.5));
    expect(momentAt(model, 1 / 4)).toBe(at(21, 11.25));
    expect(readingAt(model, 1 / 5 / 2).moment).toMatch(/13:30/);
  });
});
