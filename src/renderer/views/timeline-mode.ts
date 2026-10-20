// How the timeline draws each chat: one bar per agent, or one line counting its running agents.
export type TimelineMode = 'bars' | 'lines';

export const TIMELINE_MODES: readonly TimelineMode[] = ['bars', 'lines'];

const STORAGE_KEY: string = 'orbit.timeline-mode';
const DEFAULT_MODE: TimelineMode = 'bars';

export function isTimelineMode(value: string): value is TimelineMode {
  return (TIMELINE_MODES as readonly string[]).includes(value);
}

export function parseTimelineMode(saved: string | null): TimelineMode {
  return saved !== null && isTimelineMode(saved) ? saved : DEFAULT_MODE;
}

export function loadTimelineMode(): TimelineMode {
  try {
    return parseTimelineMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_MODE;
  }
}

export function saveTimelineMode(mode: TimelineMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The mode still applies for this run.
  }
}
