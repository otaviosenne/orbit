import type { MessageItem, TranscriptItem } from './types';

// The terminal draws markdown (no asterisks, hashes or link targets), so the draft and the written text are compared on
// letters and digits only, and only on how the draft starts: a link or a code span later on cannot spoil the match.
const COMPARED_LENGTH: number = 60;
const NOT_LETTER_OR_DIGIT: RegExp = /[^\p{L}\p{N}]+/gu;

// True once the transcript holds the block the terminal shows: from then on the real message stands for it.
export function isAlreadyWritten(draft: string, items: readonly TranscriptItem[]): boolean {
  const start: string = comparable(draft).slice(0, COMPARED_LENGTH);
  if (start.length === 0) return true;
  return repliesOfThisTurn(items).some((reply: MessageItem) => comparable(reply.text).includes(start));
}

// Claude's texts since the user's last prompt; prompts still waiting in the queue are not the turn's start.
function repliesOfThisTurn(items: readonly TranscriptItem[]): MessageItem[] {
  const lastPrompt: number = items.findLastIndex((item: TranscriptItem) => isMessage(item) && item.role === 'user' && item.isQueued !== true);
  return items.slice(lastPrompt + 1).filter((item: TranscriptItem): item is MessageItem => isMessage(item) && item.role === 'assistant');
}

function isMessage(item: TranscriptItem): item is MessageItem {
  return item.kind === 'message';
}

function comparable(text: string): string {
  return text.toLowerCase().replace(NOT_LETTER_OR_DIGIT, '');
}
