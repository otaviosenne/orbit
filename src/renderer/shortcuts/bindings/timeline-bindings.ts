import type { TimelineMode } from '../../views/timeline-mode';
import { TIMELINE_MODES } from '../../views/timeline-mode';
import type { TimelineRange } from '../../views/timeline-range';
import { TIMELINE_RANGES } from '../../views/timeline-range';
import type { TimelineScope } from '../../views/timeline-scope';
import { TIMELINE_SCOPES } from '../../views/timeline-scope';
import type { ShortcutBindings } from '../shortcut-dispatcher';
import { when } from './binding';

export interface TimelineShortcutHost {
  readonly isTimelineShown: () => boolean;
  readonly timelineMode: () => TimelineMode;
  readonly setTimelineMode: (mode: TimelineMode) => void;
  readonly timelineScope: () => TimelineScope;
  readonly setTimelineScope: (scope: TimelineScope) => void;
  readonly timelineRange: () => TimelineRange;
  readonly setTimelineRange: (range: TimelineRange) => void;
}

type TimelineShortcutId = 'timeline-mode' | 'timeline-scope' | 'timeline-longer' | 'timeline-shorter';

const LONGER: number = 1;
const SHORTER: number = -1;

// The value after the current one, back to the first after the last: a two-way switch flips.
export function nextInCycle<T>(values: readonly T[], current: T): T {
  const index: number = values.indexOf(current);
  return values[(index + 1) % values.length] ?? current;
}

// One step longer or shorter; the ends hold rather than wrap, so holding the key never jumps from the longest to the shortest.
export function steppedRange(current: TimelineRange, step: number): TimelineRange {
  const index: number = Math.min(TIMELINE_RANGES.length - 1, Math.max(0, TIMELINE_RANGES.indexOf(current) + step));
  return TIMELINE_RANGES[index] ?? current;
}

export function timelineBindings(host: TimelineShortcutHost): Pick<ShortcutBindings, TimelineShortcutId> {
  const shown: () => boolean = host.isTimelineShown;
  return {
    'timeline-mode': when(shown, (): void => host.setTimelineMode(nextInCycle(TIMELINE_MODES, host.timelineMode()))),
    'timeline-scope': when(shown, (): void => host.setTimelineScope(nextInCycle(TIMELINE_SCOPES, host.timelineScope()))),
    'timeline-longer': when(shown, (): void => host.setTimelineRange(steppedRange(host.timelineRange(), LONGER))),
    'timeline-shorter': when(shown, (): void => host.setTimelineRange(steppedRange(host.timelineRange(), SHORTER))),
  };
}
