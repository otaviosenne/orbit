import { HEIGHT, PLOT_BOTTOM, PLOT_HEIGHT, PLOT_LEFT, PLOT_RIGHT, PLOT_TOP, PLOT_WIDTH, SVG_NS, WIDTH, shape, xOf, yOf } from './pace-geometry';
import type { PaceDay, PaceModel, PacePoint } from './pace-model';
import { tickLabel, viewTicks, type PaceView } from './pace-view';

const POINT_RADIUS: number = 3.5;
// A day narrower than this share of the chart (a single hour of use) keeps its divider but not its name, which would
// run into the next one.
const MIN_LABELED_DAY_SHARE: number = 0.05;
// The lines, dots and hover marks go in here; a zoom pushes the rest of the week past the plot's edges, where the clip hides it.
export const PLOT_LAYER_CLASS: string = 'pace-plot';
// Each chart needs its own clip id, since every re-render leaves a new svg in the page.
let clipCount: number = 0;

// gridPercents: the bands drawn when nothing is zoomed; actualClass colours the usage line by how it compares to the pace.
export function renderPaceSvg(model: PaceModel, view: PaceView, gridPercents: readonly number[], actualClass: string): SVGSVGElement {
  const svg: SVGSVGElement = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('class', 'pace-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Weekly usage against an even pace');
  const plot: SVGElement = plotLayer(svg);
  viewTicks(view, gridPercents).forEach((percent: number): void => {
    const [grid, text] = gridLine(percent, view);
    svg.insertBefore(grid, plot);
    svg.append(text);
  });
  model.days.forEach((day: PaceDay, index: number): void => dayMarks(day, index, view, svg, plot));
  if (model.expected.length > 0) plot.append(line('pace-expected', model.expected, view));
  if (model.actual.length > 0) plot.append(line(`pace-actual ${actualClass}`, model.actual, view));
  const last: PacePoint | undefined = model.actual[model.actual.length - 1];
  if (last !== undefined) plot.append(dot(last, actualClass, view));
  return svg;
}

function plotLayer(svg: SVGSVGElement): SVGElement {
  clipCount += 1;
  const id: string = `pace-clip-${clipCount}`;
  const clip: SVGElement = shape('clipPath', { id });
  clip.append(shape('rect', { x: PLOT_LEFT, y: PLOT_TOP, width: PLOT_WIDTH, height: PLOT_HEIGHT }));
  const plot: SVGElement = shape('g', { class: PLOT_LAYER_CLASS, 'clip-path': `url(#${id})` });
  svg.append(clip, plot);
  return plot;
}

function gridLine(percent: number, view: PaceView): [SVGElement, SVGElement] {
  const y: number = yOf(percent, view);
  return [shape('line', { class: 'pace-grid', x1: PLOT_LEFT, x2: WIDTH - PLOT_RIGHT, y1: y, y2: y }), label(tickLabel(percent), PLOT_LEFT - 6, y + 4, 'end')];
}

// A dotted line starts each day after the first, and the day's name sits in the middle of the part of it on screen.
function dayMarks(day: PaceDay, index: number, view: PaceView, svg: SVGSVGElement, plot: SVGElement): void {
  const from: number = Math.max(day.start, view.fromX);
  const to: number = Math.min(day.end, view.toX);
  if ((to - from) / (view.toX - view.fromX) >= MIN_LABELED_DAY_SHARE) svg.append(label(day.label, (xOf(from, view) + xOf(to, view)) / 2, HEIGHT - PLOT_BOTTOM + 18, 'middle'));
  if (index > 0) plot.append(shape('line', { class: 'pace-day', x1: xOf(day.start, view), x2: xOf(day.start, view), y1: PLOT_TOP, y2: HEIGHT - PLOT_BOTTOM }));
}

function line(className: string, points: readonly PacePoint[], view: PaceView): SVGElement {
  const path: string = points.map((point: PacePoint, index: number) => `${index === 0 ? 'M' : 'L'}${xOf(point.x, view)} ${yOf(point.percent, view)}`).join(' ');
  return shape('path', { class: className, d: path });
}

function dot(point: PacePoint, className: string, view: PaceView): SVGElement {
  return shape('circle', { class: `pace-dot ${className}`, cx: xOf(point.x, view), cy: yOf(point.percent, view), r: POINT_RADIUS });
}

function label(text: string, x: number, y: number, anchor: string): SVGElement {
  const node: SVGElement = shape('text', { class: 'pace-label', x, y, 'text-anchor': anchor });
  node.textContent = text;
  return node;
}
