import type { ChatSnapshot } from '../../shared/types';
import type { ClosedChatInfo } from './closed-chat-info';
import { closedChatSnapshot, toClosedChatInfo } from './closed-chat-info';

const STORAGE_KEY: string = 'orbit.pinned-info';

// What each pinned chat looked like while it was open, so its card can stay in the Pinned row after it closes.
export class PinnedInfoStore {
  private readonly entries: Map<string, ClosedChatInfo> = new Map(load());

  // Called on each poll with the pinned chats that are open now.
  remember(chats: readonly ChatSnapshot[]): void {
    let changed: boolean = false;
    for (const chat of chats) {
      const info: ClosedChatInfo = toClosedChatInfo(chat);
      if (JSON.stringify(this.entries.get(chat.sessionId)) === JSON.stringify(info)) continue;
      this.entries.set(chat.sessionId, info);
      changed = true;
    }
    if (changed) save([...this.entries]);
  }

  // A stand-in snapshot for a pinned chat that is closed: read-only, no process behind it.
  closedSnapshot(sessionId: string): ChatSnapshot | null {
    const info: ClosedChatInfo | undefined = this.entries.get(sessionId);
    return info === undefined ? null : closedChatSnapshot(sessionId, info);
  }
}

// Storage can be unavailable; then closed pins simply drop out of the row for this run.
function load(): [string, ClosedChatInfo][] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? (stored as [string, ClosedChatInfo][]) : [];
  } catch {
    return [];
  }
}

function save(entries: [string, ClosedChatInfo][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Not persisted.
  }
}
