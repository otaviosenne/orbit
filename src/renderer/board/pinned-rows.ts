// How tall the pinned row may grow: up to where its third line of cards would begin, so two lines show and the
// rest scroll. Null when everything fits in two lines.
export function pinnedRowsLimit(cardTops: readonly number[], maxLines: number): number | null {
  const lineTops: number[] = [...new Set(cardTops.map(Math.round))].sort((a: number, b: number) => a - b);
  return lineTops.length > maxLines ? (lineTops[maxLines] ?? null) : null;
}
