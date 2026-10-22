// How many lines of cards the Suspended row shows: as few as fit them all, at most two; past that it scrolls sideways.
const MAX_LINES: number = 2;

export function suspendedLines(cardCount: number, cardsPerLine: number): number {
  if (cardCount <= 0 || cardsPerLine <= 0) return 1;
  return Math.min(Math.ceil(cardCount / cardsPerLine), MAX_LINES);
}

// How many cards of this width fit side by side in a row of this width, at least one.
export function cardsPerLineOf(rowWidth: number, cardWidth: number, gap: number): number {
  return Math.max(Math.floor((rowWidth + gap) / (cardWidth + gap)), 1);
}
