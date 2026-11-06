import { describe, expect, it } from 'vitest';
import { FULL_VIEW, isFullView, tickLabel, viewTicks, zoomInto, type PaceView } from '../src/renderer/usage/pace-view';
import { clampedPointAt, fractionAt, xOf, yOf, PLOT_LEFT, PLOT_TOP, PLOT_WIDTH, PLOT_HEIGHT } from '../src/renderer/usage/pace-geometry';

const BOTH: { time: boolean; percents: boolean } = { time: true, percents: true };
const FULL_TICKS: readonly number[] = [0, 20, 40, 60, 80, 100];

describe('pace zoom', () => {
  it('zooms into the box whichever corner the drag started from', () => {
    const view: PaceView = zoomInto({ x: 0.6, percent: 10 }, { x: 0.2, percent: 50 }, FULL_VIEW, BOTH);
    expect(view).toEqual({ fromX: 0.2, toX: 0.6, fromPercent: 10, toPercent: 50 });
    expect(isFullView(view)).toBe(false);
  });

  it('keeps the percentages for a flat stroke and the time for an upright one', () => {
    const current: PaceView = { fromX: 0.1, toX: 0.5, fromPercent: 20, toPercent: 60 };
    expect(zoomInto({ x: 0.2, percent: 30 }, { x: 0.3, percent: 31 }, current, { time: true, percents: false })).toEqual({ fromX: 0.2, toX: 0.3, fromPercent: 20, toPercent: 60 });
    expect(zoomInto({ x: 0.2, percent: 30 }, { x: 0.21, percent: 50 }, current, { time: false, percents: true })).toEqual({ fromX: 0.1, toX: 0.5, fromPercent: 30, toPercent: 50 });
  });

  it('widens a box too small to read and keeps it inside the chart', () => {
    const view: PaceView = zoomInto({ x: 0.999, percent: 99.5 }, { x: 1, percent: 100 }, FULL_VIEW, BOTH);
    expect(view.toX).toBe(1);
    expect(view.toX - view.fromX).toBeCloseTo(0.01);
    expect(view.toPercent).toBe(100);
    expect(view.toPercent - view.fromPercent).toBeCloseTo(2);
  });

  it('keeps the working-day bands on the whole chart and picks round steps when zoomed', () => {
    expect(viewTicks(FULL_VIEW, FULL_TICKS)).toEqual(FULL_TICKS);
    expect(viewTicks({ ...FULL_VIEW, fromPercent: 12, toPercent: 38 }, FULL_TICKS)).toEqual([15, 20, 25, 30, 35]);
    expect(viewTicks({ ...FULL_VIEW, fromPercent: 40, toPercent: 42 }, FULL_TICKS)).toEqual([40, 40.5, 41, 41.5, 42]);
    expect(tickLabel(40.5)).toBe('40.5%');
    expect(tickLabel(15)).toBe('15%');
  });
});

describe('pace geometry in a zoomed view', () => {
  const view: PaceView = { fromX: 0.25, toX: 0.5, fromPercent: 20, toPercent: 40 };

  it('stretches the view across the whole plot', () => {
    expect(xOf(0.25, view)).toBe(PLOT_LEFT);
    expect(xOf(0.5, view)).toBe(PLOT_LEFT + PLOT_WIDTH);
    expect(yOf(40, view)).toBe(PLOT_TOP);
    expect(yOf(20, view)).toBe(PLOT_TOP + PLOT_HEIGHT);
  });

  it('reads a position back into the view, and holds a drag past the edge on it', () => {
    expect(fractionAt(PLOT_LEFT + PLOT_WIDTH / 2, view)).toBeCloseTo(0.375);
    expect(clampedPointAt(0, PLOT_TOP + PLOT_HEIGHT * 2, view)).toEqual({ x: 0.25, percent: 20 });
  });
});
