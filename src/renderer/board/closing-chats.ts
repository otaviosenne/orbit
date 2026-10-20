import type { ChatSnapshot } from '../../shared/types';

// Long enough for kitty to close the window and the chat process to exit; past it the close did not take.
const CLOSE_GRACE_MS: number = 10_000;

// Chats being closed leave the board at once instead of after the next poll; they come back if the close fails.
export class ClosingChats {
  private readonly startedAt: Map<string, number> = new Map();

  start(sessionId: string, now: number): void {
    this.startedAt.set(sessionId, now);
  }

  cancel(sessionId: string): void {
    this.startedAt.delete(sessionId);
  }

  // Forgets chats that are gone from the poll (closed) and ones still there after the grace period.
  settle(polled: readonly ChatSnapshot[], now: number): void {
    for (const [sessionId, startedAt] of this.startedAt) {
      const isGone: boolean = !polled.some((chat: ChatSnapshot) => chat.sessionId === sessionId);
      if (isGone || now - startedAt > CLOSE_GRACE_MS) this.startedAt.delete(sessionId);
    }
  }

  hide(chats: readonly ChatSnapshot[]): ChatSnapshot[] {
    return chats.filter((chat: ChatSnapshot) => !this.startedAt.has(chat.sessionId));
  }
}
