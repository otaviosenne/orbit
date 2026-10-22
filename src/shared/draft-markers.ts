import type { AttachmentKind } from './attachment-kinds';
import { KIND_LABELS } from './attachment-kinds';
import type { MessageSegment } from './image-tokens';
import { splitOnMarkers } from './image-tokens';

// The composer's own markers: "[Image #N]", "[Video #N]", "[Audio #N]", "[PDF #N]" or "[File #N]", numbered from 1
// across all of a draft's attachments. Group 1 is the number, like Claude Code's own "[Image #N]" pattern.
const LABEL_SOURCE: string = Object.values(KIND_LABELS).join('|');
const DRAFT_MARKER_SOURCE: string = `\\[(?:${LABEL_SOURCE}) #(\\d+)\\]`;
const LABEL_PATTERN: RegExp = new RegExp(`^\\[(${LABEL_SOURCE}) #`);

const KIND_BY_LABEL: ReadonlyMap<string, AttachmentKind> = new Map(
  (Object.entries(KIND_LABELS) as [AttachmentKind, string][]).map(([kind, label]: [AttachmentKind, string]): [string, AttachmentKind] => [label, kind]),
);

// A fresh global pattern each time, since a shared one carries lastIndex between uses.
export function draftMarkerPattern(): RegExp {
  return new RegExp(DRAFT_MARKER_SOURCE, 'g');
}

export function draftMarker(kind: AttachmentKind, number: number): string {
  return `[${KIND_LABELS[kind]} #${number}]`;
}

// The kind a marker's word names; a renumbered marker keeps it.
export function markerKind(marker: string): AttachmentKind {
  const label: string | undefined = LABEL_PATTERN.exec(marker)?.[1];
  return (label === undefined ? undefined : KIND_BY_LABEL.get(label)) ?? 'file';
}

export function renumberedMarker(marker: string, number: number): string {
  return draftMarker(markerKind(marker), number);
}

// A sent draft cut at its markers; each attachment segment's index is that attachment's place in the message.
export function splitOnDraftMarkers(text: string, attachmentCount: number): MessageSegment[] {
  return splitOnMarkers(text, attachmentCount, draftMarkerPattern());
}
