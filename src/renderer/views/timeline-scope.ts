// Whether the timeline shows only the chats open now, or also the ones closed inside its window.
export type TimelineScope = 'open' | 'all';

export const TIMELINE_SCOPES: readonly TimelineScope[] = ['open', 'all'];

const STORAGE_KEY: string = 'orbit.timeline-scope';
const DEFAULT_SCOPE: TimelineScope = 'open';

export function isTimelineScope(value: string): value is TimelineScope {
  return (TIMELINE_SCOPES as readonly string[]).includes(value);
}

export function parseTimelineScope(saved: string | null): TimelineScope {
  return saved !== null && isTimelineScope(saved) ? saved : DEFAULT_SCOPE;
}

export function loadTimelineScope(): TimelineScope {
  try {
    return parseTimelineScope(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_SCOPE;
  }
}

export function saveTimelineScope(scope: TimelineScope): void {
  try {
    localStorage.setItem(STORAGE_KEY, scope);
  } catch {
    // The scope still applies for this run.
  }
}
