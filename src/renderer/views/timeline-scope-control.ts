import type { TimelineChoice } from './timeline-choice-control';
import { renderChoiceControl } from './timeline-choice-control';
import type { TimelineScope } from './timeline-scope';

export const TIMELINE_SCOPE_ATTRIBUTE: string = 'timelineScope';

const SCOPE_CHOICES: readonly TimelineChoice[] = [
  { value: 'open', label: 'Open' },
  { value: 'all', label: 'All' },
] satisfies readonly { value: TimelineScope; label: string }[];

export function renderScopeControl(current: TimelineScope): HTMLElement {
  return renderChoiceControl('Chats shown', SCOPE_CHOICES, current, TIMELINE_SCOPE_ATTRIBUTE);
}
