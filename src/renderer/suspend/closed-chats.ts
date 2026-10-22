import type { ChatSnapshot } from '../../shared/types';
import type { PinnedChats } from '../board/pinned-chats';
import type { PinnedInfoStore } from '../board/pinned-info';
import type { ColumnKey } from '../views/board-columns';
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

// A chat that was open when Orbit last watched and is not running now (a shutdown): its card waits in its old column.
export interface LeftOpenChat {
  readonly chat: ChatSnapshot;
  readonly column: ColumnKey;
}

// The board's closed chats: pinned ones in the Pinned row, suspended ones in Suspended. A chat both pinned and
// suspended is in both: in Pinned (labelled Suspended) and in the Suspended section.
export class ClosedChats {
  constructor(
    private readonly pins: PinnedChats,
    private readonly pinnedInfo: PinnedInfoStore,
    private readonly suspension: SuspendedLookup,
    private readonly openChats: () => readonly ChatSnapshot[],
    private readonly remembered: () => readonly LeftOpenChat[],
  ) {}

  // Chats left open by a shutdown, in the column they were in. A pinned or suspended one already has its own card.
  leftOpen(): LeftOpenChat[] {
    return this.remembered().filter((entry: LeftOpenChat) => !this.isOpen(entry.chat.sessionId) && !this.isElsewhere(entry.chat.sessionId));
  }

  // Pinned chats that are closed now, suspended or not, as read-only stand-ins in the order they were pinned.
  pinned(): ChatSnapshot[] {
    return this.pins.order
      .filter((sessionId: string) => !this.isOpen(sessionId))
      .flatMap((sessionId: string): ChatSnapshot[] => {
        const closed: ChatSnapshot | null = this.suspension.closedSnapshot(sessionId) ?? this.pinnedInfo.closedSnapshot(sessionId);
        return closed === null ? [] : [closed];
      });
  }

  find(sessionId: string): ClosedChat | undefined {
    if (this.isOpen(sessionId)) return undefined;
    const suspended: ChatSnapshot | null = this.suspension.closedSnapshot(sessionId);
    if (suspended !== null) return { chat: suspended, kind: 'suspended' };
    const pinned: ChatSnapshot | undefined = this.pinned().find((chat: ChatSnapshot) => chat.sessionId === sessionId);
    if (pinned !== undefined) return { chat: pinned, kind: 'closed-pin' };
    const left: LeftOpenChat | undefined = this.leftOpen().find((entry: LeftOpenChat) => entry.chat.sessionId === sessionId);
    return left === undefined ? undefined : { chat: left.chat, kind: 'left-open' };
  }

  private isElsewhere(sessionId: string): boolean {
    return this.suspension.has(sessionId) || this.pins.has(sessionId);
  }

  private isOpen(sessionId: string): boolean {
    return this.openChats().some((chat: ChatSnapshot) => chat.sessionId === sessionId);
  }
}
