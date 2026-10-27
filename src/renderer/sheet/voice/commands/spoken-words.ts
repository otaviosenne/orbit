import { withWakeWords } from './wake-word';

// Dictation varies case, accents and punctuation, so spoken words are compared bare.
const WORD_PATTERN: RegExp = /[\p{L}\p{N}]+/gu;
// What dictation leaves between the last real word and the command: spaces, commas, full stops and the like.
const TRAILING_SEPARATORS: RegExp = /[\s.,;:!?…\-–—]+$/u;

export interface SpokenWord {
  readonly bare: string;
  // Where the word begins in the dictated text.
  readonly start: number;
}

export function spokenWordsOf(text: string): SpokenWord[] {
  const words: SpokenWord[] = [...text.matchAll(WORD_PATTERN)].map((match: RegExpMatchArray): SpokenWord => ({ bare: bareWord(match[0]), start: match.index ?? 0 }));
  return withWakeWords(words);
}

export function bareWord(word: string): string {
  return word.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

// The draft that stays when a spoken command is taken off its end.
export function draftBefore(text: string, commandStart: number): string {
  return text.slice(0, commandStart).replace(TRAILING_SEPARATORS, '');
}
