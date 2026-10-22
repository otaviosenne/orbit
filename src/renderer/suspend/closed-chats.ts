import type { ChatSnapshot } from '../../shared/types';
import type { PinnedChats } from '../board/pinned-chats';
import type { PinnedInfoStore } from '../board/pinned-info';
import type { ClosedCardKind } from '../views/closed-card';

// What the lookup needs to know about suspended chats.
export interface SuspendedLookup {
  has(sessionId: string): boolean;
  closedSnapshot(sessionId: string): ChatSnapshot | null;
}

// A chat with no process that still has a card: its read-only stand-in and why it stays.
export interface ClosedChat {
  readonly chat: ChatSnapshot;
  readonly kind: ClosedCardKind;
}

// The board's closed chats: pinned ones in the Pinned row, suspended ones in Suspended. A chat both pinned and
// suspended shows only in Suspended (it keeps its pin, so it is back in Pinned once it is open again).
export class ClosedChats {
  constructor(
    private readonly pins: PinnedChats,
    private readonly pinnedInfo: PinnedInfoStore,
    private readonly suspension: SuspendedLookup,
    private readonly openChats: () => readonly ChatSnapshot[],
  ) {}

  // Pinned chats that are closed now and not suspended, as read-only stand-ins in the order they were pinned.
  pinned(): ChatSnapshot[] {
    return this.pins.order
      .filter((sessionId: string) => !this.isOpen(sessionId) && !this.suspension.has(sessionId))
      .flatMap((sessionId: string): ChatSnapshot[] => {
        const closed: ChatSnapshot | null = this.pinnedInfo.closedSnapshot(sessionId);
        return closed === null ? [] : [closed];
      });
  }

  find(sessionId: string): ClosedChat | undefined {
    if (this.isOpen(sessionId)) return undefined;
    const suspended: ChatSnapshot | null = this.suspension.closedSnapshot(sessionId);
    if (suspended !== null) return { chat: suspended, kind: 'suspended' };
    const pinned: ChatSnapshot | undefined = this.pinned().find((chat: ChatSnapshot) => chat.sessionId === sessionId);
    return pinned === undefined ? undefined : { chat: pinned, kind: 'closed-pin' };
  }

  private isOpen(sessionId: string): boolean {
    return this.openChats().some((chat: ChatSnapshot) => chat.sessionId === sessionId);
  }
}
