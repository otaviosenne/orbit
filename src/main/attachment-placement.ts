import { draftMarker, splitOnDraftMarkers } from '../shared/draft-markers';
import type { MessageSegment } from '../shared/image-tokens';
import type { SavedAttachment } from './attachments';

// The message as it goes to the terminal: files already written in as their paths, images left as "[Image #k]"
// markers numbered among the images alone, which is how the paste plan finds each image's path.
export interface PlacedMessage {
  readonly text: string;
  readonly imagePaths: string[];
}

const WHITESPACE_AT_END: RegExp = /\s$/;

// The draft numbers its markers across every attachment; a file's marker becomes its plain path (Claude Code only
// makes images of pasted paths ending in .png/.jpg/.jpeg/.gif/.webp, so any other path stays text), and an image's
// marker is renumbered for the paste plan. Markers with no attachment stay as written.
export function placeAttachments(text: string, saved: readonly SavedAttachment[]): PlacedMessage {
  const imagePaths: string[] = [];
  let placed: string = '';
  for (const segment of splitOnDraftMarkers(text, saved.length)) {
    placed += segmentText(segment, saved, imagePaths, placed);
  }
  return { text: placed, imagePaths };
}

function segmentText(segment: MessageSegment, saved: readonly SavedAttachment[], imagePaths: string[], before: string): string {
  if (segment.kind === 'text') return segment.text;
  const attachment: SavedAttachment | undefined = saved[segment.index];
  if (attachment === undefined) return '';
  if (attachment.kind === 'file') return `${separatorAfter(before)}${attachment.path}`;
  imagePaths.push(attachment.path);
  return draftMarker('image', imagePaths.length);
}

// A path appended after the text (an attachment without a marker) must not run into the last word.
function separatorAfter(before: string): string {
  return before.length === 0 || WHITESPACE_AT_END.test(before) ? '' : ' ';
}
