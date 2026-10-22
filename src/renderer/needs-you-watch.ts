import type { ChatSnapshot } from '../shared/types';

// Which chats have just come into Needs you since the last look. The first look only learns what is already there,
// so opening Orbit does not announce every chat that was waiting before it started.
export class NeedsYouWatch {
  private known: Set<string> | null = null;

  arrivals(needs: readonly ChatSnapshot[]): ChatSnapshot[] {
    const known: Set<string> | null = this.known;
    this.known = new Set(needs.map((chat: ChatSnapshot) => chat.sessionId));
    return known === null ? [] : needs.filter((chat: ChatSnapshot) => !known.has(chat.sessionId));
  }
}
