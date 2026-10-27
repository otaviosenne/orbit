import type { SpokenWord } from './spoken-words';

export const WAKE_WORD: string = 'orbit';

// How dictation spells "Orbit": a vowel (and usually an r) before "bit", a stray vowel or double t after it, a
// Portuguese diminutive ("arbitinho") or an English ending ("orbiting"). It must start like a name: "habit" and "bit"
// are ordinary words and stay out.
const WAKE_PATTERN: RegExp = /^(?:[oau]r|o)[bv][iey]t(?:t|e|s|a|inho|rinho|zinho|ing)?$/;
// Heard as something that no pattern can tell from other words.
const WAKE_VARIANTS: ReadonlySet<string> = new Set(['rbt', 'rbit', 'orbt']);
// Dictation sometimes splits the name ("or bit"); only short pieces are joined, so ordinary sentences are left alone.
const MAX_PIECE_LENGTH: number = 4;

export function isWakeWord(bare: string): boolean {
  return WAKE_PATTERN.test(bare) || WAKE_VARIANTS.has(bare);
}

// The words with every way of saying "Orbit" read as "orbit", so each command phrase needs spelling only once.
export function withWakeWords(words: readonly SpokenWord[]): SpokenWord[] {
  const result: SpokenWord[] = [];
  for (let index: number = 0; index < words.length; index++) {
    const word: SpokenWord = words[index] as SpokenWord;
    const next: SpokenWord | undefined = words[index + 1];
    if (next !== undefined && isSplitWakeWord(word.bare, next.bare)) {
      result.push({ bare: WAKE_WORD, start: word.start });
      index++;
    } else {
      result.push(isWakeWord(word.bare) ? { bare: WAKE_WORD, start: word.start } : word);
    }
  }
  return result;
}

function isSplitWakeWord(first: string, second: string): boolean {
  if (isWakeWord(first) || isWakeWord(second)) return false;
  return first.length <= MAX_PIECE_LENGTH && second.length <= MAX_PIECE_LENGTH && isWakeWord(first + second);
}
