import { imageToken, imageTokenPattern } from '../../shared/image-tokens';

// What a marker's image is now numbered, or null when the image is gone and its marker must go too.
export type Renumbering = (number: number) => number | null;

export interface DraftEdit {
  readonly text: string;
  readonly caret: number;
}

export interface TokenRange {
  readonly start: number;
  readonly end: number;
}

// A draft ready to send: markers numbered in reading order, and which attachment each number is.
export interface OrderedDraft {
  readonly text: string;
  // order[n - 1] is the attachment index behind "[Image #n]".
  readonly order: number[];
}

const WHITESPACE_AT_END: RegExp = /\s$/;
const WHITESPACE_AT_START: RegExp = /^\s/;

// Spaces keep each marker a word of its own, the way Claude Code shows it.
export function insertTokens(text: string, caret: number, numbers: readonly number[]): DraftEdit {
  const before: string = text.slice(0, caret);
  const after: string = text.slice(caret);
  const lead: string = before.length === 0 || WHITESPACE_AT_END.test(before) ? '' : ' ';
  const trail: string = WHITESPACE_AT_START.test(after) ? '' : ' ';
  const inserted: string = `${lead}${numbers.map(imageToken).join(' ')}${trail}`;
  return { text: `${before}${inserted}${after}`, caret: caret + inserted.length };
}

// A removed marker takes one space after it along, so no double space is left behind.
export function renumberTokens(text: string, renumber: Renumbering): string {
  const pattern: RegExp = new RegExp(`${imageTokenPattern().source}( ?)`, 'g');
  return text.replace(pattern, (_token: string, number: string, space: string): string => {
    const next: number | null = renumber(Number(number));
    return next === null ? '' : `${imageToken(next)}${space}`;
  });
}

// The caret moves with the text before it, so renumbering does not throw it elsewhere.
export function renumberDraft(draft: DraftEdit, renumber: Renumbering): DraftEdit {
  return { text: renumberTokens(draft.text, renumber), caret: renumberTokens(draft.text.slice(0, draft.caret), renumber).length };
}

// Marker numbers, from 1, that point at one of the attachments.
export function presentNumbers(text: string, attachmentCount: number): Set<number> {
  const numbers: number[] = [...text.matchAll(imageTokenPattern())].map((match: RegExpExecArray) => Number(match[1]));
  return new Set(numbers.filter((number: number) => number >= 1 && number <= attachmentCount));
}

// Numbers the kept attachments 1, 2, ... in their order; the other attachments' markers are dropped.
// Markers beyond the attachments are just text and stay as written.
export function compacting(kept: readonly number[], attachmentCount: number): Renumbering {
  return (number: number): number | null => {
    if (number < 1 || number > attachmentCount) return number;
    const position: number = kept.indexOf(number);
    return position === -1 ? null : position + 1;
  };
}

// The image numbered `number` was removed: its marker goes and the later ones move down.
export function removing(number: number, previousCount: number): Renumbering {
  return (marker: number): number | null => {
    if (marker === number) return null;
    return marker > number && marker <= previousCount ? marker - 1 : marker;
  };
}

// order[newIndex] is each attachment's index before the move.
export function reordering(order: readonly number[]): Renumbering {
  return (marker: number): number => {
    const position: number = order.indexOf(marker - 1);
    return position === -1 ? marker : position + 1;
  };
}

// Where each marker sits in the draft, in reading order.
export function tokenRanges(text: string): TokenRange[] {
  return [...text.matchAll(imageTokenPattern())].map((match: RegExpExecArray): TokenRange => ({ start: match.index, end: match.index + match[0].length }));
}

// A marker is all or nothing: a deletion that reaches any character of one (Backspace right after it, a key
// pressed inside it, a selection over part of it) takes the whole marker. Null when it touches none.
export function widenOverTokens(text: string, deletion: TokenRange): TokenRange | null {
  let widened: TokenRange | null = null;
  for (const token of tokenRanges(text)) {
    if (deletion.start >= token.end || deletion.end <= token.start) continue;
    const from: TokenRange = widened ?? deletion;
    widened = { start: Math.min(from.start, token.start), end: Math.max(from.end, token.end) };
  }
  return widened;
}

// Images are pasted in reading order and Claude Code numbers them that way, so the sent draft follows it too.
// An attachment whose marker was deleted is not sent.
export function orderByTokens(text: string, attachmentCount: number): OrderedDraft {
  const order: number[] = [];
  for (const match of text.matchAll(imageTokenPattern())) {
    const index: number = Number(match[1]) - 1;
    if (index >= 0 && index < attachmentCount && !order.includes(index)) order.push(index);
  }
  return { text: renumberTokens(text, (number: number): number | null => keepOrRenumber(order, number, attachmentCount)), order };
}

// Markers beyond the attachments are just text and stay as written; repeated ones keep their single new number.
function keepOrRenumber(order: readonly number[], number: number, attachmentCount: number): number {
  if (number < 1 || number > attachmentCount) return number;
  return order.indexOf(number - 1) + 1;
}
