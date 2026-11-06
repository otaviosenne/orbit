// The part of the chart on screen: a stretch of the week's axis (0 to 1) and a band of percentages. Dragging a box over
// the chart zooms into it; the whole week, 0% to 100%, is the view with nothing zoomed.
export interface PaceView {
  readonly fromX: number;
  readonly toX: number;
  readonly fromPercent: number;
  readonly toPercent: number;
}

// Two corners of a selection, already turned from the drawing into the view's own units.
export interface PaceCorner {
  readonly x: number;
  readonly percent: number;
}

const FULL_PERCENT: number = 100;
export const FULL_VIEW: PaceView = { fromX: 0, toX: 1, fromPercent: 0, toPercent: FULL_PERCENT };

// Below these spans a zoom shows one reading stretched into a straight line, so a smaller box is widened to them.
const MIN_X_SPAN: number = 0.01;
const MIN_PERCENT_SPAN: number = 2;
// Steps a zoomed axis may label; the first one that needs no more than MAX_TICK_INTERVALS bands wins.
const TICK_STEPS: readonly number[] = [0.5, 1, 2, 5, 10, 20, 25];
const MAX_TICK_INTERVALS: number = 6;
// Edges closer than this are the same tick, so rounding never draws a band edge twice.
const TICK_EPSILON: number = 1e-6;

export function isFullView(view: PaceView): boolean {
  return view.fromX === FULL_VIEW.fromX && view.toX === FULL_VIEW.toX && view.fromPercent === FULL_VIEW.fromPercent && view.toPercent === FULL_VIEW.toPercent;
}

// Which axes a box zooms: a flat stroke across the chart keeps the percentages, an upright one keeps the time.
export interface ZoomAxes {
  readonly time: boolean;
  readonly percents: boolean;
}

export function zoomInto(start: PaceCorner, end: PaceCorner, current: PaceView, axes: ZoomAxes): PaceView {
  const [fromX, toX] = axes.time ? widened(Math.min(start.x, end.x), Math.max(start.x, end.x), MIN_X_SPAN, 0, 1) : [current.fromX, current.toX];
  const [fromPercent, toPercent] = axes.percents
    ? widened(Math.min(start.percent, end.percent), Math.max(start.percent, end.percent), MIN_PERCENT_SPAN, 0, FULL_PERCENT)
    : [current.fromPercent, current.toPercent];
  return { fromX, toX, fromPercent, toPercent };
}

// Grows a range too small to read around its middle, then slides it back inside the axis.
function widened(from: number, to: number, minSpan: number, lowest: number, highest: number): [number, number] {
  if (to - from >= minSpan) return [Math.max(from, lowest), Math.min(to, highest)];
  const middle: number = (from + to) / 2;
  const start: number = Math.min(Math.max(middle - minSpan / 2, lowest), highest - minSpan);
  return [start, start + minSpan];
}

// The percentages a view draws a grid line at. The whole chart keeps its own bands (one per working day).
export function viewTicks(view: PaceView, fullTicks: readonly number[]): number[] {
  if (view.fromPercent === FULL_VIEW.fromPercent && view.toPercent === FULL_VIEW.toPercent) return [...fullTicks];
  const span: number = view.toPercent - view.fromPercent;
  const step: number = TICK_STEPS.find((candidate: number) => span / candidate <= MAX_TICK_INTERVALS) ?? FULL_PERCENT;
  const ticks: number[] = [];
  for (let tick: number = Math.ceil(view.fromPercent / step - TICK_EPSILON) * step; tick <= view.toPercent + TICK_EPSILON; tick += step) ticks.push(tick);
  return ticks;
}

// A tick's text: whole numbers stay whole, half steps keep their one decimal.
export function tickLabel(percent: number): string {
  return `${Number(percent.toFixed(1))}%`;
}
