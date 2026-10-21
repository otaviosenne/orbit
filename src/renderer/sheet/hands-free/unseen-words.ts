const WORD_GAP: RegExp = /\s+/;

export function wordCount(text: string): number {
  const trimmed: string = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(WORD_GAP).length;
}

// A segment's transcript always starts over from its first word; once the draft took over its first `seen` words,
// only the rest is still to be placed. Counted in words because the final text may recase or repunctuate them.
export function wordsAfter(text: string, seen: number): string {
  if (seen === 0) return text;
  return text.trim().split(WORD_GAP).slice(seen).join(' ');
}
