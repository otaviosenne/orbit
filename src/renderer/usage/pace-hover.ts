import { element } from '../dom';
import { HEIGHT, PLOT_BOTTOM, PLOT_TOP, fractionAt, shape, svgPointOf, xOf, yOf } from './pace-geometry';
import { readingAt, type PaceModel, type PaceReading } from './pace-model';
import { PLOT_LAYER_CLASS } from './pace-svg';
import type { PaceView } from './pace-view';

const DOT_RADIUS: number = 4;
// The tooltip flips to the other side of the pointer past this share of the width, so it never leaves the chart.
const FLIP_SHARE: number = 0.6;
const TOOLTIP_OFFSET_PX: number = 14;

// Hovering the chart shows both lines at that point: a guide, a dot on each line, and the two percentages.
export function attachPaceHover(box: HTMLElement, model: PaceModel, view: PaceView, actualClass: string): void {
  const svg: SVGSVGElement | null = box.querySelector('svg');
  if (svg === null) return;
  const guide: SVGElement = shape('line', { class: 'pace-guide', y1: PLOT_TOP, y2: HEIGHT - PLOT_BOTTOM });
  const expectedDot: SVGElement = shape('circle', { class: 'pace-dot pace-dot-expected pace-hover-mark', r: DOT_RADIUS });
  const actualDot: SVGElement = shape('circle', { class: `pace-dot ${actualClass} pace-hover-mark`, r: DOT_RADIUS });
  const tip: HTMLDivElement = element('div', 'pace-tip');
  const marks: SVGElement[] = [guide, expectedDot, actualDot];
  // Inside the plot's clip, so a dot for a value above or below a zoomed band stays hidden.
  (svg.querySelector(`.${PLOT_LAYER_CLASS}`) ?? svg).append(...marks);
  box.append(tip);
  const hide = (): void => {
    marks.forEach((mark: SVGElement): void => mark.setAttribute('visibility', 'hidden'));
    tip.hidden = true;
  };
  hide();
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('pointermove', (event: PointerEvent): void => {
    const fraction: number | null = fractionAt(svgPointOf(svg, event).x, view);
    if (fraction === null) return hide();
    const reading: PaceReading = readingAt(model, fraction);
    place(guide, expectedDot, actualDot, fraction, reading, view);
    marks.forEach((mark: SVGElement): void => mark.setAttribute('visibility', 'visible'));
    actualDot.setAttribute('visibility', reading.actual === null ? 'hidden' : 'visible');
    show(tip, box, event, reading);
  });
}

function place(guide: SVGElement, expectedDot: SVGElement, actualDot: SVGElement, fraction: number, reading: PaceReading, view: PaceView): void {
  const x: string = String(xOf(fraction, view));
  guide.setAttribute('x1', x);
  guide.setAttribute('x2', x);
  expectedDot.setAttribute('cx', x);
  expectedDot.setAttribute('cy', String(yOf(reading.expected, view)));
  actualDot.setAttribute('cx', x);
  actualDot.setAttribute('cy', String(yOf(reading.actual ?? 0, view)));
}

function show(tip: HTMLElement, box: HTMLElement, event: PointerEvent, reading: PaceReading): void {
  const rect: DOMRect = box.getBoundingClientRect();
  const x: number = event.clientX - rect.left;
  const when: string | null = reading.moment ?? reading.day;
  tip.replaceChildren(
    ...(when === null ? [] : [element('span', 'pace-tip-day', when)]),
    element('span', 'pace-tip-row', `Used ${reading.actual === null ? 'no reading' : `${Math.round(reading.actual)}%`}`),
    element('span', 'pace-tip-row', `Even pace ${Math.round(reading.expected)}%`),
  );
  tip.hidden = false;
  const isRight: boolean = x > rect.width * FLIP_SHARE;
  tip.style.left = isRight ? `${x - tip.offsetWidth - TOOLTIP_OFFSET_PX}px` : `${x + TOOLTIP_OFFSET_PX}px`;
  tip.style.top = `${event.clientY - rect.top - tip.offsetHeight - TOOLTIP_OFFSET_PX / 2}px`;
}
