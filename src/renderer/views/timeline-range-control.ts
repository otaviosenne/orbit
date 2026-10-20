import type { TimelineRange } from './timeline-range';
import { TIMELINE_RANGES } from './timeline-range';
import type { TimelineChoice } from './timeline-choice-control';
import { renderChoiceControl } from './timeline-choice-control';

export const TIMELINE_RANGE_ATTRIBUTE: string = 'timelineRange';

// How far back the timeline reaches.
export function renderRangeControl(current: TimelineRange): HTMLElement {
  const choices: TimelineChoice[] = TIMELINE_RANGES.map((range: TimelineRange): TimelineChoice => ({ value: range, label: range }));
  return renderChoiceControl('Time range', choices, current, TIMELINE_RANGE_ATTRIBUTE);
}
