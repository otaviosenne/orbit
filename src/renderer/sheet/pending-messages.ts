import type { AttachmentKind } from '../../shared/attachment-kinds';
import { draftMarkerPattern } from '../../shared/draft-markers';
import { imageTokenPattern } from '../../shared/image-tokens';
import type { FileReference } from './transcript/file-references';
import { findFileReferences } from './transcript/file-references';
import type { MessageItem, TranscriptItem } from '../../shared/types';

// The transcript timestamp can trail the click by a moment; allow for clocks being slightly apart.
const CLOCK_SLACK_MS: number = 5000;

// A local copy of a file sent with a message, shown until the transcript has the message.
export interface PendingAttachment {
  readonly kind: AttachmentKind;
  readonly name: string;
  readonly url: string;
}

export interface PendingMessage {
  readonly id: string;
  readonly text: string;
  // Every attachment, in the order of the draft's markers.
  readonly attachments: readonly PendingAttachment[];
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

  add(text: string, attachments: readonly PendingAttachment[], now: number): PendingMessage {
    const imageUrls: string[] = attachments.filter((attachment: PendingAttachment) => attachment.kind === 'image').map((attachment: PendingAttachment) => attachment.url);
    const message: PendingMessage = { id: `pending-${this.nextId++}`, text, attachments, imageUrls, sentAt: now, delivered: false };
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

// Typed delivery flattens line breaks, Claude Code renumbers the "[Image #N]" markers, and Orbit writes each file's
// path where the draft had its marker; compare what is left.
function normalize(text: string): string {
  return withoutFilePaths(text).replace(draftMarkerPattern(), ' ').replace(imageTokenPattern(), ' ').replace(/\s+/g, ' ').trim();
}

function withoutFilePaths(text: string): string {
  return findFileReferences(text).reduceRight((rest: string, reference: FileReference): string => `${rest.slice(0, reference.start)} ${rest.slice(reference.end)}`, text);
}

// The local copies of the files that are not images, which nothing shows once the transcript has the message.
export function fileUrlsOf(message: PendingMessage): string[] {
  return message.attachments.filter((attachment: PendingAttachment) => attachment.kind !== 'image').map((attachment: PendingAttachment) => attachment.url);
}
