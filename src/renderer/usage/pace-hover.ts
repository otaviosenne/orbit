import { element } from '../dom';
import { HEIGHT, PLOT_BOTTOM, PLOT_TOP, WIDTH, fractionAt, shape, xOf, yOf } from './pace-geometry';
import { readingAt, type PaceModel, type PaceReading } from './pace-model';

const DOT_RADIUS: number = 4;
// The tooltip flips to the other side of the pointer past this share of the width, so it never leaves the chart.
const FLIP_SHARE: number = 0.6;
const TOOLTIP_OFFSET_PX: number = 14;

// Hovering the chart shows both lines at that point: a guide, a dot on each line, and the two percentages.
export function attachPaceHover(box: HTMLElement, model: PaceModel, actualClass: string): void {
  const svg: SVGSVGElement | null = box.querySelector('svg');
  if (svg === null) return;
  const guide: SVGElement = shape('line', { class: 'pace-guide', y1: PLOT_TOP, y2: HEIGHT - PLOT_BOTTOM });
  const expectedDot: SVGElement = shape('circle', { class: 'pace-dot pace-dot-expected', r: DOT_RADIUS });
  const actualDot: SVGElement = shape('circle', { class: `pace-dot ${actualClass}`, r: DOT_RADIUS });
  const tip: HTMLDivElement = element('div', 'pace-tip');
  const marks: SVGElement[] = [guide, expectedDot, actualDot];
  svg.append(...marks);
  box.append(tip);
  const hide = (): void => {
    marks.forEach((mark: SVGElement): void => mark.setAttribute('visibility', 'hidden'));
    tip.hidden = true;
  };
  hide();
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('pointermove', (event: PointerEvent): void => {
    const rect: DOMRect = svg.getBoundingClientRect();
    const fraction: number | null = fractionAt(((event.clientX - rect.left) / rect.width) * WIDTH);
    if (fraction === null) return hide();
    const reading: PaceReading = readingAt(model, fraction);
    place(guide, expectedDot, actualDot, fraction, reading);
    marks.forEach((mark: SVGElement): void => mark.setAttribute('visibility', 'visible'));
    actualDot.setAttribute('visibility', reading.actual === null ? 'hidden' : 'visible');
    show(tip, box, event, reading);
  });
}

function place(guide: SVGElement, expectedDot: SVGElement, actualDot: SVGElement, fraction: number, reading: PaceReading): void {
  guide.setAttribute('x1', String(xOf(fraction)));
  guide.setAttribute('x2', String(xOf(fraction)));
  expectedDot.setAttribute('cx', String(xOf(fraction)));
  expectedDot.setAttribute('cy', String(yOf(reading.expected)));
  actualDot.setAttribute('cx', String(xOf(fraction)));
  actualDot.setAttribute('cy', String(yOf(reading.actual ?? 0)));
}

function show(tip: HTMLElement, box: HTMLElement, event: PointerEvent, reading: PaceReading): void {
  const rect: DOMRect = box.getBoundingClientRect();
  const x: number = event.clientX - rect.left;
  tip.replaceChildren(
    ...(reading.day === null ? [] : [element('span', 'pace-tip-day', reading.day)]),
    element('span', 'pace-tip-row', `Used ${reading.actual === null ? 'no reading' : `${Math.round(reading.actual)}%`}`),
    element('span', 'pace-tip-row', `Even pace ${Math.round(reading.expected)}%`),
  );
  tip.hidden = false;
  const isRight: boolean = x > rect.width * FLIP_SHARE;
  tip.style.left = isRight ? `${x - tip.offsetWidth - TOOLTIP_OFFSET_PX}px` : `${x + TOOLTIP_OFFSET_PX}px`;
  tip.style.top = `${event.clientY - rect.top - tip.offsetHeight - TOOLTIP_OFFSET_PX / 2}px`;
}
