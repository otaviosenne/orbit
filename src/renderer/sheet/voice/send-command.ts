// A draft ending in "enviar" is sent. Longer spoken forms come first so all of their words go, not just the last one.
// Dictation varies case, accents and punctuation, so words are compared bare. If one word proves too easy to say by
// accident, this list is the one place to change it.
const SEND_PHRASES: readonly (readonly string[])[] = [
  ['enviar', 'pode', 'enviar'],
  ['enviar', 'enviar'],
  ['pode', 'enviar'],
  ['enviar'],
];
const WORD_PATTERN: RegExp = /[\p{L}\p{N}]+/gu;
// What dictation leaves between the last real word and the command: spaces, commas, full stops and the like.
const TRAILING_SEPARATORS: RegExp = /[\s.,;:!?…\-–—]+$/u;

interface Word {
  readonly bare: string;
  readonly start: number;
}

// The draft without its spoken send command, or null when it does not end with one.
export function stripSendCommand(text: string): string | null {
  const words: Word[] = [...text.matchAll(WORD_PATTERN)].map((match: RegExpMatchArray): Word => ({ bare: bare(match[0]), start: match.index ?? 0 }));
  for (const phrase of SEND_PHRASES) {
    const tail: Word[] = words.slice(-phrase.length);
    if (tail.length === phrase.length && tail.every((word: Word, index: number) => word.bare === phrase[index])) {
      return text.slice(0, tail[0]?.start ?? 0).replace(TRAILING_SEPARATORS, '');
    }
  }
  return null;
}

function bare(word: string): string {
  return word.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
