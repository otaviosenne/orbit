// Spoken endings that send the draft: said twice, or with "pode" between, so the word "enviar" inside a sentence
// never sends by accident. Dictation varies case, accents and punctuation, so words are compared bare.
const SEND_PHRASES: readonly (readonly string[])[] = [
  ['enviar', 'enviar'],
  ['enviar', 'pode', 'enviar'],
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
