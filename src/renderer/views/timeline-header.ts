import { element } from '../dom';
import { formatClock } from '../format';
import type { TimeWindow } from './timeline-layout';
import { toPercent } from './timeline-layout';
import type { TimelineMode } from './timeline-mode';
import { renderModeControl } from './timeline-mode-control';
import type { TimelineRange } from './timeline-range';
import { renderRangeControl } from './timeline-range-control';
import type { TimelineScope } from './timeline-scope';
import { renderScopeControl } from './timeline-scope-control';

// The choices above the timeline, shared by its bar and line views.
export interface TimelineControls {
  readonly range: TimelineRange;
  readonly scope: TimelineScope;
  readonly mode: TimelineMode;
}

export function renderTimelineHeader(controls: TimelineControls): HTMLElement {
  const header: HTMLDivElement = element('div', 'timeline-header');
  header.append(renderRangeControl(controls.range), renderScopeControl(controls.scope), renderModeControl(controls.mode));
  return header;
}

export function renderTimelineAxis(window: TimeWindow, tickTimesInWindow: readonly number[]): HTMLElement {
  const axis: HTMLDivElement = element('div', 'timeline-axis');
  const ticks: HTMLDivElement = element('div', 'timeline-ticks');
  for (const tick of tickTimesInWindow) {
    const label: HTMLSpanElement = element('span', 'timeline-tick', formatClock(tick));
    label.style.left = `${toPercent(tick, window)}%`;
    ticks.append(label);
  }
  axis.append(element('span', 'timeline-gutter'), ticks);
  return axis;
}
