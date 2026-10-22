import type { AttachmentKind } from '../../shared/attachment-kinds';
import { draftMarkerPattern, markerKind } from '../../shared/draft-markers';

// A marker drawn as a chip: its brackets stay in the text (so it keeps its width) but are not shown,
// leaving "Image #N" (or "PDF #N", ...) with a bracket's width of room on each side, like the chip in a sent message.
export interface MarkerSegment {
  readonly kind: 'marker';
  readonly attachment: AttachmentKind;
  readonly number: number;
  readonly opening: string;
  readonly label: string;
  readonly closing: string;
}

export interface TextSegment {
  readonly kind: 'text';
  readonly text: string;
}

export type DraftSegment = TextSegment | MarkerSegment;

const BRACKET_LENGTH: number = 1;

// The draft cut into plain text and markers; joined back together the pieces are the draft, character for character.
export function splitDraftMarkers(text: string): DraftSegment[] {
  const segments: DraftSegment[] = [];
  let cursor: number = 0;
  for (const match of text.matchAll(draftMarkerPattern())) {
    pushText(segments, text.slice(cursor, match.index));
    segments.push(markerSegment(match[0], Number(match[1])));
    cursor = match.index + match[0].length;
  }
  pushText(segments, text.slice(cursor));
  return segments;
}

export function segmentText(segment: DraftSegment): string {
  return segment.kind === 'text' ? segment.text : `${segment.opening}${segment.label}${segment.closing}`;
}

function markerSegment(token: string, number: number): MarkerSegment {
  const labelEnd: number = token.length - BRACKET_LENGTH;
  return { kind: 'marker', attachment: markerKind(token), number, opening: token.slice(0, BRACKET_LENGTH), label: token.slice(BRACKET_LENGTH, labelEnd), closing: token.slice(labelEnd) };
}

function pushText(segments: DraftSegment[], text: string): void {
  if (text.length > 0) segments.push({ kind: 'text', text });
}
