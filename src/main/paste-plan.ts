import type { MessageSegment } from '../shared/image-tokens';
import { splitOnImageTokens } from '../shared/image-tokens';

// Lets Claude Code take in a pasted piece of text before the next one arrives.
const TEXT_SETTLE_MS: number = 150;
// Claude Code reads and encodes a pasted image file before the next paste can be taken in.
const IMAGE_SETTLE_MS: number = 400;

// One send-text into the chat's terminal, and how long to wait before the next.
export interface PasteStep {
  readonly text: string;
  readonly asPaste: boolean;
  readonly settleMs: number;
}

// The composer's own "[Image #N]" markers are not typed: Claude Code writes its own, numbered across the whole chat,
// when the image's path is pasted at that spot.
export function pastePlan(text: string, imagePaths: readonly string[], asPaste: boolean): PasteStep[] {
  return splitOnImageTokens(text, imagePaths.length).map((segment: MessageSegment): PasteStep => {
    if (segment.kind === 'text') return { text: segment.text, asPaste, settleMs: TEXT_SETTLE_MS };
    return { text: imagePaths[segment.index] ?? '', asPaste: true, settleMs: IMAGE_SETTLE_MS };
  });
}
