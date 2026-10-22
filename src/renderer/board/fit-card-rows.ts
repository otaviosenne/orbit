import { pinnedRowsLimit } from './pinned-rows';

const CARD_SELECTOR: string = ':scope > .card';

// Caps a wrapping strip of cards at a number of lines; card heights vary (agent rows), so the cap is measured.
export function fitCardRows(cards: HTMLElement | null, maxLines: number): void {
  if (cards === null) return;
  cards.style.maxHeight = '';
  const tops: number[] = [...cards.querySelectorAll<HTMLElement>(CARD_SELECTOR)].map((card: HTMLElement) => card.offsetTop);
  const limit: number | null = pinnedRowsLimit(tops, maxLines);
  // The next line starts one gap below the last shown, so stopping just above it leaves no sliver of it showing.
  if (limit !== null) cards.style.maxHeight = `${limit - cards.offsetTop - parseFloat(getComputedStyle(cards).rowGap) / 2}px`;
}
