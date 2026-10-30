import type { ChatSnapshot } from '../../shared/types';
import { closedChatSnapshot, toClosedChatInfo } from '../board/closed-chat-info';
import { saveShared } from '../board/shared-storage';
import type { SuspendedEntry } from './suspended-membership';
import { leavingSessionIds, newestFirst, withoutSuspendedRuns } from './suspended-membership';

const STORAGE_KEY: string = 'orbit.suspended';

// Chats closed on purpose to come back to later: kept at the bottom of the board until they are open again.
export class SuspendedChats {
  private entries: SuspendedEntry[] = load();

  // False on Orbit Web: see settle.
  constructor(private readonly sharesSettled: boolean = true) {}

  has(sessionId: string): boolean {
    return this.entries.some((entry: SuspendedEntry) => entry.sessionId === sessionId);
  }

  // Suspending again replaces the older record, so one chat never has two cards.
  add(chat: ChatSnapshot, now: number): void {
    const entry: SuspendedEntry = { sessionId: chat.sessionId, runStartedAt: chat.startedAt, suspendedAt: now, info: toClosedChatInfo(chat) };
    this.entries = [...this.entries.filter((candidate: SuspendedEntry) => candidate.sessionId !== chat.sessionId), entry];
    save(this.entries);
  }

  remove(sessionId: string, share: boolean = true): void {
    if (!this.has(sessionId)) return;
    this.entries = this.entries.filter((entry: SuspendedEntry) => entry.sessionId !== sessionId);
    save(this.entries, share);
  }

  // Another Orbit window changed Suspended.
  reload(): void {
    this.entries = load();
  }

  // Called with every poll: a chat that is open again in a new run, or whose close never took, leaves Suspended.
  // Only the desktop sends these to the other windows (see saveShared).
  settle(live: readonly ChatSnapshot[], now: number): void {
    leavingSessionIds(this.entries, live, now).forEach((sessionId: string): void => this.remove(sessionId, this.sharesSettled));
  }

  // The chats the board shows as live: a suspended run still closing is already in Suspended instead.
  visible(chats: readonly ChatSnapshot[]): ChatSnapshot[] {
    return withoutSuspendedRuns(chats, this.entries);
  }

  withoutSuspended(sessionIds: readonly string[]): string[] {
    return sessionIds.filter((sessionId: string) => !this.has(sessionId));
  }

  // Read-only stand-ins for the Suspended section, newest first.
  snapshots(): ChatSnapshot[] {
    return newestFirst(this.entries).map((entry: SuspendedEntry) => closedChatSnapshot(entry.sessionId, entry.info));
  }

  closedSnapshot(sessionId: string): ChatSnapshot | null {
    const entry: SuspendedEntry | undefined = this.entries.find((candidate: SuspendedEntry) => candidate.sessionId === sessionId);
    return entry === undefined ? null : closedChatSnapshot(entry.sessionId, entry.info);
  }
}

// Storage can be unavailable; then suspended chats are remembered for this run only.
function load(): SuspendedEntry[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function isEntry(value: unknown): value is SuspendedEntry {
  const entry: Partial<SuspendedEntry> = (value ?? {}) as Partial<SuspendedEntry>;
  return typeof entry.sessionId === 'string' && typeof entry.runStartedAt === 'number' && typeof entry.suspendedAt === 'number'
    && typeof entry.info === 'object' && entry.info !== null && typeof entry.info.name === 'string';
}

function save(entries: readonly SuspendedEntry[], share: boolean = true): void {
  saveShared(STORAGE_KEY, JSON.stringify(entries), share);
}
