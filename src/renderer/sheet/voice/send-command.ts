// Spoken commands at the end of a draft, words no prompt ends with by accident: "chinelo" or "Orbit enviar" send it,
// "Orbit clear" or "chat clear" empty it. Said twice, the first one goes too. Dictation varies case, accents and
// punctuation, so words are compared bare. These lists are the one place to change them; longer forms come first so
// all of their words are removed.
const SEND_PHRASES: readonly (readonly string[])[] = [
  ['orbit', 'enviar'],
  ['chinelo', 'chinelo'],
  ['chinelo'],
];
const CLEAR_PHRASES: readonly (readonly string[])[] = [
  ['orbit', 'clear'],
  ['chat', 'clear'],
];
const WORD_PATTERN: RegExp = /[\p{L}\p{N}]+/gu;
// What dictation leaves between the last real word and the command: spaces, commas, full stops and the like.
const TRAILING_SEPARATORS: RegExp = /[\s.,;:!?…\-–—]+$/u;

interface Word {
  readonly bare: string;
  readonly start: number;
}

export type VoiceCommand = { readonly action: 'send'; readonly text: string } | { readonly action: 'clear' };

// The command a draft ends with, with what is left of the draft for a send; null when it ends with none.
export function voiceCommandOf(text: string): VoiceCommand | null {
  const words: Word[] = [...text.matchAll(WORD_PATTERN)].map((match: RegExpMatchArray): Word => ({ bare: bare(match[0]), start: match.index ?? 0 }));
  if (endsWithAny(words, CLEAR_PHRASES) !== null) return { action: 'clear' };
  const start: number | null = endsWithAny(words, SEND_PHRASES);
  return start === null ? null : { action: 'send', text: text.slice(0, start).replace(TRAILING_SEPARATORS, '') };
}

// The draft without its spoken send command, or null when it does not end with one.
export function stripSendCommand(text: string): string | null {
  const command: VoiceCommand | null = voiceCommandOf(text);
  return command?.action === 'send' ? command.text : null;
}

// Where the matching phrase begins in the text, or null.
function endsWithAny(words: readonly Word[], phrases: readonly (readonly string[])[]): number | null {
  for (const phrase of phrases) {
    const tail: Word[] = words.slice(-phrase.length);
    if (tail.length === phrase.length && tail.every((word: Word, index: number) => word.bare === phrase[index])) return tail[0]?.start ?? 0;
  }
  return null;
}

function bare(word: string): string {
  return word.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
