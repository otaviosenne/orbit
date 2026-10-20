import type { TimelineChoice } from './timeline-choice-control';
import { renderChoiceControl } from './timeline-choice-control';
import type { TimelineMode } from './timeline-mode';

export const TIMELINE_MODE_ATTRIBUTE: string = 'timelineMode';

const MODE_CHOICES: readonly TimelineChoice[] = [
  { value: 'bars', label: 'Bars' },
  { value: 'lines', label: 'Lines' },
] satisfies readonly { value: TimelineMode; label: string }[];

export function renderModeControl(current: TimelineMode): HTMLElement {
  return renderChoiceControl('Timeline style', MODE_CHOICES, current, TIMELINE_MODE_ATTRIBUTE);
}
