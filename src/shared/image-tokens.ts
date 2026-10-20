// "[Image #N]" marks where an image sits in a message: Claude Code writes it, and the composer uses it too.
const IMAGE_TOKEN_SOURCE: string = '\\[Image #(\\d+)\\]';

export type MessageSegment =
  | { readonly kind: 'text'; readonly text: string }
  // index counts the message's attachments from 0.
  | { readonly kind: 'image'; readonly index: number };

// A fresh global pattern each time, since a shared one carries lastIndex between uses.
export function imageTokenPattern(): RegExp {
  return new RegExp(IMAGE_TOKEN_SOURCE, 'g');
}

export function imageToken(number: number): string {
  return `[Image #${number}]`;
}

// The composer numbers its markers from 1 by attachment; each image goes where its marker is.
// Markers with no attachment stay as text, and attachments with no marker go at the end.
export function splitOnImageTokens(text: string, attachmentCount: number): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const placed: Set<number> = new Set();
  let cursor: number = 0;
  for (const match of text.matchAll(imageTokenPattern())) {
    const index: number = Number(match[1]) - 1;
    if (index < 0 || index >= attachmentCount || placed.has(index)) continue;
    pushText(segments, text.slice(cursor, match.index));
    segments.push({ kind: 'image', index });
    placed.add(index);
    cursor = match.index + match[0].length;
  }
  pushText(segments, text.slice(cursor));
  for (let index: number = 0; index < attachmentCount; index++) {
    if (!placed.has(index)) segments.push({ kind: 'image', index });
  }
  return segments;
}

function pushText(segments: MessageSegment[], text: string): void {
  if (text.length > 0) segments.push({ kind: 'text', text });
}
