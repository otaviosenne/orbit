import { imageTokenPattern } from '../../shared/image-tokens';
import type { MessageItem, TranscriptItem } from '../../shared/types';

// The transcript timestamp can trail the click by a moment; allow for clocks being slightly apart.
const CLOCK_SLACK_MS: number = 5000;

export interface PendingMessage {
  readonly id: string;
  readonly text: string;
  // Local copies of the attached images, in the order Claude Code numbers them.
  readonly imageUrls: readonly string[];
  readonly sentAt: number;
  // A busy chat queues the message and writes it to its transcript much later, so delivery is tracked on its own.
  readonly delivered: boolean;
}

// A sent message the chat's transcript now shows, with the transcript's own copy of it.
export interface Confirmation {
  readonly message: PendingMessage;
  readonly item: MessageItem;
}

export interface Reconciliation {
  readonly waiting: PendingMessage[];
  readonly confirmed: Confirmation[];
}

// Messages shown in the thread the moment they are sent, until the chat's own transcript has them.
export class PendingMessages {
  private pending: PendingMessage[] = [];
  private nextId: number = 0;

  add(text: string, imageUrls: readonly string[], now: number): PendingMessage {
    const message: PendingMessage = { id: `pending-${this.nextId++}`, text, imageUrls, sentAt: now, delivered: false };
    this.pending.push(message);
    return message;
  }

  markDelivered(id: string): void {
    this.pending = this.pending.map((message: PendingMessage) => (message.id === id ? { ...message, delivered: true } : message));
  }

  // Returns the dropped message, whose image copies the caller then lets go of.
  remove(id: string): PendingMessage | undefined {
    const removed: PendingMessage | undefined = this.pending.find((message: PendingMessage) => message.id === id);
    this.pending = this.pending.filter((message: PendingMessage) => message.id !== id);
    return removed;
  }

  clear(): PendingMessage[] {
    const dropped: PendingMessage[] = this.pending;
    this.pending = [];
    return dropped;
  }

  // Keeps only the messages the transcript does not show yet, and reports which ones it now shows.
  reconcile(items: readonly TranscriptItem[]): Reconciliation {
    const waiting: PendingMessage[] = [];
    const confirmed: Confirmation[] = [];
    for (const message of this.pending) {
      const item: MessageItem | undefined = items.find((candidate: TranscriptItem): candidate is MessageItem => confirms(candidate, message));
      if (item === undefined) waiting.push(message);
      else confirmed.push({ message, item });
    }
    this.pending = waiting;
    return { waiting: [...waiting], confirmed };
  }
}

function confirms(item: TranscriptItem, message: PendingMessage): item is MessageItem {
  if (item.kind !== 'message' || item.role !== 'user') return false;
  return item.timestamp >= message.sentAt - CLOCK_SLACK_MS && normalize(item.text) === normalize(message.text);
}

// Typed delivery flattens line breaks, and Claude Code renumbers the "[Image #N]" markers; compare what is left.
function normalize(text: string): string {
  return text.replace(imageTokenPattern(), ' ').replace(/\s+/g, ' ').trim();
}
