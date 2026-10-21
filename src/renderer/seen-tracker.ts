import type { ChatSnapshot } from '../shared/types';

const STORAGE_KEY: string = 'orbit.seen';

// "Unseen": the chat finished (or started waiting) after the last time the user looked at it,
// either by opening it here or by having its terminal window focused. A chat only becomes seen
// when the user leaves it, so it does not jump out of "Needs you" while it is still being read.
export class SeenTracker {
  private readonly seenAt: Map<string, number>;
  private viewing: ReadonlySet<string> = new Set();

  // Chats that finished before the radar started count as seen, so nothing lights up on first launch.
  constructor(private readonly startedAt: number) {
    this.seenAt = new Map(load());
  }

  // Chats being looked at right now; any chat that was in the previous set and is not anymore is marked seen.
  updateViewing(current: ReadonlySet<string>, now: number): void {
    for (const sessionId of this.viewing) if (!current.has(sessionId)) this.markSeen(sessionId, now);
    this.viewing = current;
  }

  markSeen(sessionId: string, at: number): void {
    this.seenAt.set(sessionId, at);
    save([...this.seenAt]);
  }

  // Unseen and not being looked at right now: opening a chat reads it (the green dot goes) while it
  // stays in "Needs you" until you leave, since you may still have to act on it.
  hasUnreadReply(chat: ChatSnapshot): boolean {
    return this.isUnseen(chat) && !this.viewing.has(chat.sessionId);
  }

  isUnseen(chat: ChatSnapshot): boolean {
    if (chat.status === 'busy') return false;
    // A chat with no reply yet has nothing to read; a reopened one keeps its old reply time, so a resume after
    // a reboot does not light up chats you had already read.
    if (chat.lastReplyAt === null) return false;
    return chat.lastReplyAt > (this.seenAt.get(chat.sessionId) ?? this.startedAt);
  }
}

// Storage can be unavailable; then "seen" simply lasts for this run.
function load(): [string, number][] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as [string, number][];
  } catch {
    return [];
  }
}

function save(entries: [string, number][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Not persisted.
  }
}
