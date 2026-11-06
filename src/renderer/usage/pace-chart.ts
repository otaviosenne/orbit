import { element } from '../dom';
import { FULL_PERCENT } from './pace-geometry';
import { attachPaceHover } from './pace-hover';
import { WORK_DAY_COUNT } from './work-schedule';
import { WEEK_MS, buildPaceModel, paceGap, type PaceModel } from './pace-model';
import { renderPaceSvg } from './pace-svg';
import { FULL_VIEW, isFullView, type PaceView } from './pace-view';
import { attachPaceZoom } from './pace-zoom';
import type { PaceScale } from './pace-scale';
import { renderPaceScaleToggle, savedPaceScale } from './pace-scale-toggle';
import type { UsageSample } from '../../shared/types';

// One step per working day, so each band of the chart is the share of the week a day can use at an even pace (20% each).
export const GRID_PERCENTS: readonly number[] = Array.from({ length: WORK_DAY_COUNT + 1 }, (_: unknown, day: number): number => (day * FULL_PERCENT) / WORK_DAY_COUNT);
// Within this many points of the line counts as on pace, so a tiny lead does not flash red.
const ON_PACE_MARGIN: number = 2;

// Which week is shown, counted back from the current one; kept across the page's re-renders on every poll.
let weeksBack: number = 0;
let scale: PaceScale = savedPaceScale();
// The zoomed part of the chart, also kept across re-renders; a new week or span starts from the whole week again.
let view: PaceView = FULL_VIEW;

export function renderPaceChart(resetsAt: number, samples: readonly UsageSample[], now: number): HTMLElement {
  const box: HTMLDivElement = element('div', 'pace');
  const draw = (): void => {
    const windowEnd: number = resetsAt - weeksBack * WEEK_MS;
    const model: PaceModel = buildPaceModel(windowEnd, samples, now, scale);
    const hasEarlier: boolean = samples.some((sample: UsageSample) => sample.at < windowEnd - WEEK_MS);
    box.replaceChildren(
      renderHead(
        renderWeekNav(windowEnd, hasEarlier, (change: number): void => {
          weeksBack += change;
          view = FULL_VIEW;
          draw();
        }),
        renderPaceScaleToggle(scale, (chosen: PaceScale): void => {
          scale = chosen;
          view = FULL_VIEW;
          draw();
        }),
      ),
      element('p', `pace-summary ${paceClass(model)}`, summary(model)),
      renderPaceSvg(model, view, GRID_PERCENTS, paceClass(model)),
      zoomHint(),
    );
    attachPaceHover(box, model, view, paceClass(model));
    attachPaceZoom(box, view, (next: PaceView): void => {
      view = next;
      draw();
    });
  };
  draw();
  return box;
}

// Says how the chart answers a drag or a click, depending on whether it is zoomed.
function zoomHint(): HTMLElement {
  return element('p', 'pace-zoom-hint', isFullView(view) ? 'Drag over the chart to zoom in' : 'Zoomed in: click the chart to see the whole week');
}

// The week on the left and the span on the right, on one row while they fit.
function renderHead(nav: HTMLElement, toggle: HTMLElement): HTMLElement {
  const head: HTMLDivElement = element('div', 'pace-head');
  head.append(nav, toggle);
  return head;
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
