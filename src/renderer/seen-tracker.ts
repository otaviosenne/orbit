import type { ChatSnapshot } from '../shared/types';

const STORAGE_KEY: string = 'orbit.seen';
const REPLY_READ_KEY: string = 'orbit.reply-read';

// "Unseen": the chat finished (or started waiting) after the last time the user looked at it,
// either by opening it here or by having its terminal window focused. A chat only becomes seen
// when the user leaves it, so it does not jump out of "Needs you" while it is still being read.
export class SeenTracker {
  private readonly seenAt: Map<string, number>;
  // When the user last left a chat after reading a reply they had not seen yet.
  private readonly replyReadAt: Map<string, number>;
  private viewing: ReadonlySet<string> = new Set();
  // Chats being looked at that had an unseen reply at some point while open.
  private readonly readingReply: Set<string> = new Set();

  // Chats that finished before the radar started count as seen, so nothing lights up on first launch.
  constructor(private readonly startedAt: number) {
    this.seenAt = new Map(load(STORAGE_KEY));
    this.replyReadAt = new Map(load(REPLY_READ_KEY));
  }

  // Chats being looked at right now; any chat that was in the previous set and is not anymore is marked seen.
  updateViewing(current: readonly ChatSnapshot[], now: number): void {
    const viewing: ReadonlySet<string> = new Set(current.map((chat: ChatSnapshot) => chat.sessionId));
    for (const sessionId of this.viewing) if (!viewing.has(sessionId)) this.leave(sessionId, now);
    for (const chat of current) if (this.isUnseen(chat)) this.readingReply.add(chat.sessionId);
    this.viewing = viewing;
  }

  markSeen(sessionId: string, at: number): void {
    this.seenAt.set(sessionId, at);
    save(STORAGE_KEY, [...this.seenAt]);
  }

  // Unseen and not being looked at right now: opening a chat reads it (the green dot goes) while it
  // stays in "Needs you" until you leave, since you may still have to act on it.
  hasUnreadReply(chat: ChatSnapshot): boolean {
    return this.isUnseen(chat) && !this.viewing.has(chat.sessionId);
  }

  // When the user last read a reply they had not seen: now while they are reading it, null if never since storage
  // began. Opening a chat whose reply was already read does not count, so looking at an idle chat leaves it idle.
  lastReplyReadAt(sessionId: string, now: number): number | null {
    if (this.viewing.has(sessionId) && this.readingReply.has(sessionId)) return now;
    return this.replyReadAt.get(sessionId) ?? null;
  }

  isUnseen(chat: ChatSnapshot): boolean {
    if (chat.status === 'busy') return false;
    // A chat with no reply yet has nothing to read; a reopened one keeps its old reply time, so a resume after
    // a reboot does not light up chats you had already read.
    if (chat.lastReplyAt === null) return false;
    return chat.lastReplyAt > (this.seenAt.get(chat.sessionId) ?? this.startedAt);
  }

  private leave(sessionId: string, now: number): void {
    if (this.readingReply.delete(sessionId)) {
      this.replyReadAt.set(sessionId, now);
      save(REPLY_READ_KEY, [...this.replyReadAt]);
    }
    this.markSeen(sessionId, now);
  }
}

// Storage can be unavailable; then "seen" simply lasts for this run.
function load(key: string): [string, number][] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as [string, number][];
  } catch {
    return [];
  }
}

function save(key: string, entries: [string, number][]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Not persisted.
  }
}
