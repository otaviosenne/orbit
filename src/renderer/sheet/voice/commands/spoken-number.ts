import type { SpokenWord } from './spoken-words';

// "vinte e um" is the longest way to say one.
const MAX_NUMBER_WORDS: number = 3;
const DIGITS: RegExp = /^\d{1,2}$/;
const PORTUGUESE_AND: string = 'e';

const UNITS: ReadonlyMap<string, number> = new Map([
  ['um', 1], ['uma', 1], ['one', 1],
  ['dois', 2], ['duas', 2], ['two', 2],
  ['tres', 3], ['three', 3],
  ['quatro', 4], ['four', 4],
  ['cinco', 5], ['five', 5],
  ['seis', 6], ['six', 6],
  ['sete', 7], ['seven', 7],
  ['oito', 8], ['eight', 8],
  ['nove', 9], ['nine', 9],
]);
const TEENS: ReadonlyMap<string, number> = new Map([
  ['dez', 10], ['ten', 10],
  ['onze', 11], ['eleven', 11],
  ['doze', 12], ['twelve', 12],
  ['treze', 13], ['thirteen', 13],
  ['catorze', 14], ['quatorze', 14], ['fourteen', 14],
  ['quinze', 15], ['fifteen', 15],
  ['dezesseis', 16], ['dezasseis', 16], ['sixteen', 16],
  ['dezessete', 17], ['dezassete', 17], ['seventeen', 17],
  ['dezoito', 18], ['eighteen', 18],
  ['dezenove', 19], ['dezanove', 19], ['nineteen', 19],
]);
const TENS: ReadonlyMap<string, number> = new Map([
  ['vinte', 20], ['twenty', 20],
  ['trinta', 30], ['thirty', 30],
  ['quarenta', 40], ['forty', 40],
  ['cinquenta', 50], ['fifty', 50],
  ['sessenta', 60], ['sixty', 60],
  ['setenta', 70], ['seventy', 70],
  ['oitenta', 80], ['eighty', 80],
  ['noventa', 90], ['ninety', 90],
]);

// 1–99 from bare words said as digits ("3"), in Portuguese ("vinte e um") or in English ("twenty one"); null otherwise.
export function parseSpokenNumber(words: readonly string[]): number | null {
  const [first, second, third] = words;
  if (first === undefined) return null;
  if (words.length === 1) return singleWord(first);
  const tens: number | undefined = TENS.get(first);
  if (tens === undefined) return null;
  if (words.length === 2) return withUnit(tens, second);
  return words.length === 3 && second === PORTUGUESE_AND ? withUnit(tens, third) : null;
}

// Whether the word alone may still grow into a bigger number ("vinte" before "e um").
export function isOpenEndedNumberWord(word: string): boolean {
  return TENS.has(word);
}

export interface NumberAtTail {
  readonly value: number;
  // Where the number's first word is in the word list.
  readonly firstWord: number;
}

// The number the words end with, taking as many words as make one ("vinte e um" over "um").
export function numberAtTail(words: readonly SpokenWord[]): NumberAtTail | null {
  for (let length: number = Math.min(MAX_NUMBER_WORDS, words.length); length >= 1; length--) {
    const firstWord: number = words.length - length;
    const value: number | null = parseSpokenNumber(words.slice(firstWord).map((word: SpokenWord): string => word.bare));
    if (value !== null) return { value, firstWord };
  }
  return null;
}

function singleWord(word: string): number | null {
  if (DIGITS.test(word)) return Number(word) >= 1 ? Number(word) : null;
  return UNITS.get(word) ?? TEENS.get(word) ?? TENS.get(word) ?? null;
}

function withUnit(tens: number, word: string | undefined): number | null {
  const unit: number | undefined = word === undefined ? undefined : UNITS.get(word);
  return unit === undefined ? null : tens + unit;
}
