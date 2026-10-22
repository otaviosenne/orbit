// Chats are numbered 1..99 for voice commands ("chat 3").
const MAX_CHAT_NUMBER: number = 99;
// A chat missing from a poll or two keeps its number, so a hiccup in the listing never renumbers the board.
const RELEASE_GRACE_MS: number = 6000;

// A short number per open chat: given in order of first appearance, kept while the chat exists and freed (smallest
// first) once it has been gone for a while. Nothing is saved: a restart starts from 1 again.
export class ChatNumbers {
  private readonly bySession: Map<string, number> = new Map();
  private readonly lastSeen: Map<string, number> = new Map();

  sync(sessionIds: readonly string[], now: number): void {
    for (const sessionId of sessionIds) {
      this.lastSeen.set(sessionId, now);
      if (!this.bySession.has(sessionId)) this.give(sessionId);
    }
    this.releaseGone(now);
  }

  numberOf(sessionId: string): number | null {
    return this.bySession.get(sessionId) ?? null;
  }

  sessionOf(number: number): string | null {
    for (const [sessionId, given] of this.bySession) if (given === number) return sessionId;
    return null;
  }

  private give(sessionId: string): void {
    const taken: ReadonlySet<number> = new Set(this.bySession.values());
    for (let candidate: number = 1; candidate <= MAX_CHAT_NUMBER; candidate++) {
      if (taken.has(candidate)) continue;
      this.bySession.set(sessionId, candidate);
      return;
    }
  }

  private releaseGone(now: number): void {
    for (const [sessionId, seenAt] of this.lastSeen) {
      if (now - seenAt <= RELEASE_GRACE_MS) continue;
      this.lastSeen.delete(sessionId);
      this.bySession.delete(sessionId);
    }
  }
}

export const chatNumbers: ChatNumbers = new ChatNumbers();
