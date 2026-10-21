// Review screens are not always laid out alike: an item may sit behind a box border ("│ ● …") and carry its answer
// on the same line ("● Question? → Answer"). These helpers bring every form to the plain "● Question" / "→ Answer" one.
const LEADING_BORDER: RegExp = /^(\s*)[│┃╎╏|]\s?/u;
const INLINE_ANSWER: RegExp = /^(.*\S)\s+→\s+(.+)$/u;

// The border is replaced by spaces, so a wrapped line still reads as indented continuation.
export function withoutBorder(line: string): string {
  return line.replace(LEADING_BORDER, (_: string, indent: string): string => `${indent}  `);
}

export interface SplitItem {
  readonly question: string;
  readonly answer: string | null;
}

// A question line that also holds its answer after an arrow, or just the question.
export function splitInlineAnswer(text: string): SplitItem {
  const inline: RegExpExecArray | null = INLINE_ANSWER.exec(text);
  if (inline === null) return { question: text, answer: null };
  return { question: (inline[1] ?? '').trim(), answer: (inline[2] ?? '').trim() };
}
