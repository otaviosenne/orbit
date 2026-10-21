// The text around the caret when dictation started; dictated words go between the two halves.
export interface DraftAnchor {
  readonly before: string;
  readonly after: string;
}

export interface PlacedText {
  readonly value: string;
  readonly caret: number;
}

// Words are kept a space apart from the word before them; the caret ends right after the last one.
export function placeDictation(anchor: DraftAnchor, text: string): PlacedText {
  const { before, after } = anchor;
  const spaced: string = text.length === 0 || before.length === 0 || /\s$/.test(before) ? text : ` ${text}`;
  return { value: `${before}${spaced}${after}`, caret: before.length + spaced.length };
}
