// The Suspended row wraps like Pinned (cards per line from the width) for up to two lines; past that it keeps two
// lines and scrolls sideways, which is why it then flows by column.
const MAX_LINES: number = 2;

export function suspendedScrolls(cardCount: number, cardsPerLine: number): boolean {
  return cardCount > cardsPerLine * MAX_LINES;
}

// How many cards of this width fit side by side in a row of this width, at least one.
export function cardsPerLineOf(rowWidth: number, cardWidth: number, gap: number): number {
  return Math.max(Math.floor((rowWidth + gap) / (cardWidth + gap)), 1);
}
