import { PLOT_HEIGHT, PLOT_LEFT, PLOT_TOP, PLOT_WIDTH, clampedPointAt, shape, svgPointOf } from './pace-geometry';
import { FULL_VIEW, isFullView, zoomInto, type PaceView, type ZoomAxes } from './pace-view';

// A press that moves less than this (in the drawing's units, about a few pixels on a phone) is a click, not a box.
const MIN_DRAG: number = 8;
// The class the chart wears while a box is drawn, so the hover tooltip steps aside.
export const SELECTING_CLASS: string = 'is-selecting';

// True from the press until the release: the page skips its rebuild on each poll meanwhile, which would drop the drag.
let pressed: boolean = false;

export function isPaceSelecting(): boolean {
  return pressed;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

// Drag a box over the chart to zoom into it; a click while zoomed goes back to the whole week.
export function attachPaceZoom(box: HTMLElement, view: PaceView, onZoom: (next: PaceView) => void): void {
  const svg: SVGSVGElement | null = box.querySelector('svg');
  if (svg === null) return;
  const selection: SVGElement = shape('rect', { class: 'pace-selection', visibility: 'hidden' });
  svg.append(selection);
  let start: Point | null = null;
  svg.addEventListener('pointerdown', (event: PointerEvent): void => {
    if (event.button !== 0) return;
    start = clampToPlot(svgPointOf(svg, event));
    pressed = true;
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event: PointerEvent): void => {
    if (start === null) return;
    const end: Point = clampToPlot(svgPointOf(svg, event));
    if (!isDrag(start, end)) return;
    box.classList.add(SELECTING_CLASS);
    drawSelection(selection, start, end);
  });
  svg.addEventListener('pointerup', (event: PointerEvent): void => {
    if (start === null) return;
    const end: Point = clampToPlot(svgPointOf(svg, event));
    const from: Point = start;
    cancel();
    if (isDrag(from, end)) onZoom(zoomFor(from, end, view));
    else if (!isFullView(view)) onZoom(FULL_VIEW);
  });
  const cancel = (): void => {
    start = null;
    pressed = false;
    box.classList.remove(SELECTING_CLASS);
    selection.setAttribute('visibility', 'hidden');
  };
  svg.addEventListener('pointercancel', cancel);
  svg.addEventListener('lostpointercapture', cancel);
}

function zoomFor(start: Point, end: Point, view: PaceView): PaceView {
  return zoomInto(clampedPointAt(start.x, start.y, view), clampedPointAt(end.x, end.y, view), view, axesOf(start, end));
}

// An axis the drag barely moved along is left as it is: a flat stroke zooms only the time, an upright one only the percentages.
function axesOf(start: Point, end: Point): ZoomAxes {
  return { time: Math.abs(end.x - start.x) >= MIN_DRAG, percents: Math.abs(end.y - start.y) >= MIN_DRAG };
}

function isDrag(start: Point, end: Point): boolean {
  const axes: ZoomAxes = axesOf(start, end);
  return axes.time || axes.percents;
}

// The box spans the whole plot along an axis it does not zoom, so it shows exactly what will fill the chart.
function drawSelection(selection: SVGElement, start: Point, end: Point): void {
  const axes: ZoomAxes = axesOf(start, end);
  selection.setAttribute('x', String(axes.time ? Math.min(start.x, end.x) : PLOT_LEFT));
  selection.setAttribute('width', String(axes.time ? Math.abs(end.x - start.x) : PLOT_WIDTH));
  selection.setAttribute('y', String(axes.percents ? Math.min(start.y, end.y) : PLOT_TOP));
  selection.setAttribute('height', String(axes.percents ? Math.abs(end.y - start.y) : PLOT_HEIGHT));
  selection.setAttribute('visibility', 'visible');
}

function clampToPlot(point: Point): Point {
  return {
    x: Math.min(Math.max(point.x, PLOT_LEFT), PLOT_LEFT + PLOT_WIDTH),
    y: Math.min(Math.max(point.y, PLOT_TOP), PLOT_TOP + PLOT_HEIGHT),
  };
}
