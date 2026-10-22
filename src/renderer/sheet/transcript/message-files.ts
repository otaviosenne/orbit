import type { AttachmentKind } from '../../../shared/attachment-kinds';
import { draftMarker, splitOnDraftMarkers } from '../../../shared/draft-markers';
import type { MessageSegment } from '../../../shared/image-tokens';
import type { PendingAttachment } from '../pending-messages';
import type { FileReference } from './file-references';
import { findFileReferences } from './file-references';

// A file chip in a sent message: the path Claude got, or (while the message is still being sent) the local copy.
export interface FileChip {
  readonly kind: AttachmentKind;
  readonly name: string;
  readonly path: string | null;
  readonly isAttachment: boolean;
  readonly localUrl: string | null;
}

// A message's text with each file swapped for a placeholder markdown leaves alone (a path's "_" or "*" would turn
// into emphasis), and the chips that take the placeholders' places once the markdown is drawn.
export interface MessageFiles {
  readonly text: string;
  readonly chips: FileChip[];
}

// Private-use characters: never typed, and kept as they are by markdown and the sanitizer.
const PLACEHOLDER_OPEN: string = '';
const PLACEHOLDER_CLOSE: string = '';
const PLACEHOLDER_SOURCE: string = `${PLACEHOLDER_OPEN}(\\d+)${PLACEHOLDER_CLOSE}`;

export function placeholderPattern(): RegExp {
  return new RegExp(PLACEHOLDER_SOURCE, 'g');
}

function placeholder(index: number): string {
  return `${PLACEHOLDER_OPEN}${index}${PLACEHOLDER_CLOSE}`;
}

// The transcript's copy: the paths Orbit wrote in where the draft's file chips were.
export function transcriptFiles(text: string): MessageFiles {
  const references: FileReference[] = findFileReferences(text);
  let cursor: number = 0;
  let replaced: string = '';
  references.forEach((reference: FileReference, index: number): void => {
    replaced += `${text.slice(cursor, reference.start)}${placeholder(index)}`;
    cursor = reference.end;
  });
  const chips: FileChip[] = references.map((reference: FileReference): FileChip => ({
    kind: reference.kind,
    name: reference.name,
    path: reference.path,
    isAttachment: reference.isAttachment,
    localUrl: null,
  }));
  return { text: `${replaced}${text.slice(cursor)}`, chips };
}

// Orbit's own copy of a message being sent: its draft markers, numbered across every attachment. Images become
// "[Image #k]" counted among the images (as Claude Code will number them), files become chips of the local copies.
export function pendingFiles(text: string, attachments: readonly PendingAttachment[]): MessageFiles {
  const chips: FileChip[] = [];
  let images: number = 0;
  const parts: string[] = splitOnDraftMarkers(text, attachments.length).map((segment: MessageSegment): string => {
    if (segment.kind === 'text') return segment.text;
    const attachment: PendingAttachment | undefined = attachments[segment.index];
    if (attachment === undefined) return '';
    if (attachment.kind === 'image') return ` ${draftMarker('image', ++images)}`;
    chips.push({ kind: attachment.kind, name: attachment.name, path: null, isAttachment: true, localUrl: attachment.url });
    return ` ${placeholder(chips.length - 1)}`;
  });
  return { text: parts.join('').trim(), chips };
}
