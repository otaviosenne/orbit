import { element } from '../dom';
import { WEEK_MS, buildPaceModel, paceGap, type PaceDay, type PaceModel, type PacePoint } from './pace-model';
import type { UsageSample } from '../../shared/types';

const SVG_NS: 'http://www.w3.org/2000/svg' = 'http://www.w3.org/2000/svg';
const WIDTH: number = 640;
const HEIGHT: number = 230;
const PLOT_LEFT: number = 38;
const PLOT_RIGHT: number = 12;
const PLOT_TOP: number = 12;
const PLOT_BOTTOM: number = 30;
const GRID_PERCENTS: readonly number[] = [0, 25, 50, 75, 100];
const FULL_PERCENT: number = 100;
const POINT_RADIUS: number = 3.5;
// Within this many points of the line counts as on pace, so a tiny lead does not flash red.
const ON_PACE_MARGIN: number = 2;

// Which week is shown, counted back from the current one; kept across the page's re-renders on every poll.
let weeksBack: number = 0;

export function renderPaceChart(resetsAt: number, samples: readonly UsageSample[], now: number): HTMLElement {
  const box: HTMLDivElement = element('div', 'pace');
  const draw = (): void => {
    const windowEnd: number = resetsAt - weeksBack * WEEK_MS;
    const model: PaceModel = buildPaceModel(windowEnd, samples, now);
    const hasEarlier: boolean = samples.some((sample: UsageSample) => sample.at < windowEnd - WEEK_MS);
    box.replaceChildren(
      renderWeekNav(windowEnd, hasEarlier, (change: number): void => {
        weeksBack += change;
        draw();
      }),
      element('p', `pace-summary ${paceClass(model)}`, summary(model)),
      renderSvg(model),
    );
  };
  draw();
  return box;
}

function renderWeekNav(windowEnd: number, hasEarlier: boolean, step: (change: number) => void): HTMLElement {
  const nav: HTMLDivElement = element('div', 'pace-nav');
  const earlier: HTMLButtonElement = element('button', 'pace-step', '‹');
  const later: HTMLButtonElement = element('button', 'pace-step', '›');
  earlier.type = 'button';
  later.type = 'button';
  earlier.setAttribute('aria-label', 'Previous week');
  later.setAttribute('aria-label', 'Next week');
  earlier.disabled = !hasEarlier;
  later.disabled = weeksBack === 0;
  earlier.addEventListener('click', (): void => step(1));
  later.addEventListener('click', (): void => step(-1));
  nav.append(earlier, element('span', 'pace-week', weekTitle(windowEnd)), later);
  return nav;
}

function weekTitle(windowEnd: number): string {
  if (weeksBack === 0) return 'This week';
  if (weeksBack === 1) return 'Last week';
  const format = (at: number): string => new Date(at).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${format(windowEnd - WEEK_MS)} – ${format(windowEnd)}`;
}

function paceClass(model: PaceModel): string {
  if (model.isPast) return '';
  const gap: number | null = paceGap(model);
  if (gap === null || Math.abs(gap) <= ON_PACE_MARGIN) return '';
  return gap > 0 ? 'is-over' : 'is-under';
}

function summary(model: PaceModel): string {
  const gap: number | null = paceGap(model);
  if (gap === null || model.actualNow === null) return model.isPast ? 'No readings were saved for this week.' : 'Collecting readings: the line fills in as Orbit reads your usage.';
  if (model.isPast) return `The week ended at ${Math.round(model.actualNow)}% used.`;
  const used: string = `${Math.round(model.actualNow)}% used, an even pace is ${Math.round(model.expectedNow)}%`;
  if (Math.abs(gap) <= ON_PACE_MARGIN) return `${used}: on pace.`;
  return `${used}: ${Math.round(Math.abs(gap))} points ${gap > 0 ? 'above the line, slow down' : 'below the line, plenty of room'}.`;
}

function renderSvg(model: PaceModel): SVGSVGElement {
  const svg: SVGSVGElement = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('class', 'pace-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Weekly usage against an even pace over working hours');
  GRID_PERCENTS.forEach((percent: number): void => svg.append(...gridLine(percent)));
  model.days.forEach((day: PaceDay, index: number): void => svg.append(...dayMarks(day, index)));
  svg.append(line('pace-expected', [{ x: 0, percent: 0 }, { x: 1, percent: FULL_PERCENT }]));
  if (model.actual.length > 0) svg.append(line(`pace-actual ${paceClass(model)}`, model.actual));
  const last: PacePoint | undefined = model.actual[model.actual.length - 1];
  if (last !== undefined) svg.append(dot(last, paceClass(model)));
  return svg;
}

function gridLine(percent: number): SVGElement[] {
  const y: number = yOf(percent);
  return [
    shape('line', { class: 'pace-grid', x1: PLOT_LEFT, x2: WIDTH - PLOT_RIGHT, y1: y, y2: y }),
    label(`${percent}%`, PLOT_LEFT - 6, y + 4, 'end'),
  ];
}

// A dotted line starts each day after the first, and the day's name sits in the middle of its stretch.
function dayMarks(day: PaceDay, index: number): SVGElement[] {
  const marks: SVGElement[] = [label(day.label, (xOf(day.start) + xOf(day.end)) / 2, HEIGHT - PLOT_BOTTOM + 18, 'middle')];
  if (index > 0) marks.push(shape('line', { class: 'pace-day', x1: xOf(day.start), x2: xOf(day.start), y1: PLOT_TOP, y2: HEIGHT - PLOT_BOTTOM }));
  return marks;
}

function line(className: string, points: readonly PacePoint[]): SVGElement {
  const path: string = points.map((point: PacePoint, index: number) => `${index === 0 ? 'M' : 'L'}${xOf(point.x)} ${yOf(point.percent)}`).join(' ');
  return shape('path', { class: className, d: path });
}

function dot(point: PacePoint, className: string): SVGElement {
  return shape('circle', { class: `pace-dot ${className}`, cx: xOf(point.x), cy: yOf(point.percent), r: POINT_RADIUS });
}

function label(text: string, x: number, y: number, anchor: string): SVGElement {
  const node: SVGElement = shape('text', { class: 'pace-label', x, y, 'text-anchor': anchor });
  node.textContent = text;
  return node;
}

function shape(tag: string, attributes: Record<string, string | number>): SVGElement {
  const node: SVGElement = document.createElementNS(SVG_NS, tag) as SVGElement;
  Object.entries(attributes).forEach(([name, value]: [string, string | number]): void => node.setAttribute(name, String(value)));
  return node;
}

function xOf(fraction: number): number {
  return PLOT_LEFT + fraction * (WIDTH - PLOT_LEFT - PLOT_RIGHT);
}

function yOf(percent: number): number {
  return PLOT_TOP + (1 - Math.min(percent, FULL_PERCENT) / FULL_PERCENT) * (HEIGHT - PLOT_TOP - PLOT_BOTTOM);
}
