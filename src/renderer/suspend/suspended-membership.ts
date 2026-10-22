import type { ChatSnapshot } from '../../shared/types';
import type { ClosedChatInfo } from '../board/closed-chat-info';
import { CLOSE_GRACE_MS } from '../board/closing-chats';

// A suspended chat: the run (process start) that was closed, when, and how its card looked.
export interface SuspendedEntry {
  readonly sessionId: string;
  // The process start of the run that was suspended. A resumed chat keeps its session id but starts a new run,
  // which is how reopening is told apart from the closing run still being in the poll for a moment.
  readonly runStartedAt: number;
  readonly suspendedAt: number;
  readonly info: ClosedChatInfo;
}

// The suspended run itself, still alive while its window closes (or if the close never took).
export function isSuspendedRun(entry: SuspendedEntry, chat: ChatSnapshot): boolean {
  return chat.sessionId === entry.sessionId && chat.startedAt === entry.runStartedAt;
}

// Opened again by any path (Reopen, a sent message, Resume, a terminal): the same chat in a run of its own.
export function isReopened(entry: SuspendedEntry, chat: ChatSnapshot): boolean {
  return chat.sessionId === entry.sessionId && chat.startedAt !== entry.runStartedAt;
}

// The suspended run is still there past the time a close takes, so the close did not happen (kitty may be asking
// to confirm); like a Close that did not take, the chat goes back to the board.
export function isCloseOverdue(entry: SuspendedEntry, chat: ChatSnapshot, now: number): boolean {
  return isSuspendedRun(entry, chat) && now - entry.suspendedAt > CLOSE_GRACE_MS;
}

// The entries that leave Suspended: their chat is open again, or it never closed.
export function leavingSessionIds(entries: readonly SuspendedEntry[], live: readonly ChatSnapshot[], now: number): string[] {
  return entries
    .filter((entry: SuspendedEntry) => live.some((chat: ChatSnapshot) => isReopened(entry, chat) || isCloseOverdue(entry, chat, now)))
    .map((entry: SuspendedEntry) => entry.sessionId);
}

// A suspended chat shows only in Suspended, even while its closing run is still in the poll.
export function withoutSuspendedRuns(chats: readonly ChatSnapshot[], entries: readonly SuspendedEntry[]): ChatSnapshot[] {
  return chats.filter((chat: ChatSnapshot) => !entries.some((entry: SuspendedEntry) => isSuspendedRun(entry, chat)));
}

// The most recently suspended first, so a chat just put away is the one in reach.
export function newestFirst(entries: readonly SuspendedEntry[]): SuspendedEntry[] {
  return [...entries].sort((a: SuspendedEntry, b: SuspendedEntry) => b.suspendedAt - a.suspendedAt);
}
