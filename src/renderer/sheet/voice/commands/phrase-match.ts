import type { Phrase } from './phrase-table';
import type { NumberAtTail } from './spoken-number';
import { numberAtTail } from './spoken-number';
import type { SpokenWord } from './spoken-words';

// Where in the text the phrase begins when the words end with it; null otherwise.
export function phraseStart(words: readonly SpokenWord[], phrase: Phrase): number | null {
  const first: number = words.length - phrase.length;
  if (first < 0) return null;
  const isMatch: boolean = phrase.every((bare: string, offset: number): boolean => words[first + offset]?.bare === bare);
  return isMatch ? (words[first]?.start ?? 0) : null;
}

// The longest run of words the glued phrase can be split into.
const MAX_GLUED_WORDS: number = 4;

// Where the glued phrase begins when the last words, spaces left out, spell it; null otherwise.
export function gluedStart(words: readonly SpokenWord[], glued: string): number | null {
  for (let length: number = 1; length <= Math.min(MAX_GLUED_WORDS, words.length); length++) {
    const tail: readonly SpokenWord[] = words.slice(-length);
    if (tail.map((word: SpokenWord): string => word.bare).join('') === glued) return tail[0]?.start ?? 0;
  }
  return null;
}

export interface NumberedMatch {
  readonly number: number;
  readonly start: number;
  // The number is one open-ended word that more words could still extend.
  readonly canGrow: boolean;
  // Words come before the phrase.
  readonly leadingWords: number;
}

// "<prefix> <number>" at the end of the words; the prefix may be empty.
export function numberedStart(words: readonly SpokenWord[], prefix: Phrase, isOpenEnded: (word: string) => boolean): NumberedMatch | null {
  const tail: NumberAtTail | null = numberAtTail(words);
  if (tail === null) return null;
  const phraseFirst: number = tail.firstWord - prefix.length;
  if (phraseFirst < 0) return null;
  const isPrefix: boolean = prefix.every((bare: string, offset: number): boolean => words[phraseFirst + offset]?.bare === bare);
  if (!isPrefix) return null;
  const isSingleWord: boolean = tail.firstWord === words.length - 1;
  return {
    number: tail.value,
    start: words[phraseFirst]?.start ?? 0,
    canGrow: isSingleWord && isOpenEnded(words[tail.firstWord]?.bare ?? ''),
    leadingWords: phraseFirst,
  };
}
