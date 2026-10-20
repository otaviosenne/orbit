import type { ChatSnapshot, ClosedChatActivity } from '../../shared/types';
import type { TimelineRange } from './timeline-range';
import { rangeHistoryMs } from './timeline-range';
import type { TimelineScope } from './timeline-scope';
import { loadTimelineScope, saveTimelineScope } from './timeline-scope';

// Closed chats change slowly and reading them touches many transcripts, so they are not refetched on every poll.
export const TIMELINE_HISTORY_REFRESH_MS: number = 30_000;

export interface HistoryFetchMark {
  readonly at: number;
  readonly range: TimelineRange;
  readonly openSessionIds: ReadonlySet<string>;
}

// A new range, stale data, or a chat closed since the last fetch (it would otherwise vanish until the next one).
export function isHistoryFetchDue(last: HistoryFetchMark | null, range: TimelineRange, openSessionIds: ReadonlySet<string>, now: number): boolean {
  if (last === null || last.range !== range || now - last.at >= TIMELINE_HISTORY_REFRESH_MS) return true;
  return [...last.openSessionIds].some((sessionId: string) => !openSessionIds.has(sessionId));
}

// The timeline's Open / All choice and the closed chats it shows in "All".
export class TimelineHistoryFeed {
  private current: TimelineScope = loadTimelineScope();
  private chats: readonly ClosedChatActivity[] = [];
  private last: HistoryFetchMark | null = null;
  private pendingRange: TimelineRange | null = null;
  private latestRequest: number = 0;

  constructor(private readonly onUpdate: () => void) {}

  get scope(): TimelineScope {
    return this.current;
  }

  get closed(): readonly ClosedChatActivity[] {
    return this.current === 'all' ? this.chats : [];
  }

  setScope(scope: TimelineScope): void {
    this.current = scope;
    saveTimelineScope(scope);
    // Switching to "All" always shows fresh history rather than whatever was fetched before.
    this.last = null;
  }

  request(range: TimelineRange, open: readonly ChatSnapshot[], now: number): void {
    if (this.current !== 'all' || this.pendingRange === range) return;
    const openSessionIds: ReadonlySet<string> = new Set(open.map((chat: ChatSnapshot) => chat.sessionId));
    if (isHistoryFetchDue(this.last, range, openSessionIds, now)) void this.fetch({ at: now, range, openSessionIds });
  }

  private async fetch(mark: HistoryFetchMark): Promise<void> {
    const request: number = ++this.latestRequest;
    this.pendingRange = mark.range;
    try {
      const chats: ClosedChatActivity[] = await window.radar.getTimelineHistory(mark.at - rangeHistoryMs(mark.range));
      // A range picked while this was loading has its own request; this answer is for a window no longer shown.
      if (request !== this.latestRequest) return;
      this.chats = chats;
      this.last = mark;
      this.onUpdate();
    } catch (error: unknown) {
      console.error('Could not read closed chats for the timeline', error);
      // Waits the usual interval before trying again instead of retrying on every poll.
      if (request === this.latestRequest) this.last = mark;
    } finally {
      if (request === this.latestRequest) this.pendingRange = null;
    }
  }
}
