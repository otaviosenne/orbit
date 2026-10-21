import { pinnedRowsLimit } from './pinned-rows';

const CARDS_SELECTOR: string = '.pinned-cards';
const CARD_SELECTOR: string = ':scope > .card';
// Two lines of pinned cards, then the row scrolls instead of pushing the columns down.
const MAX_LINES: number = 2;

// Caps the wrapping pinned row at two lines of cards; their heights vary (agent rows), so the cap is measured.
export function fitPinnedRows(root: HTMLElement): void {
  const cards: HTMLElement | null = root.querySelector<HTMLElement>(CARDS_SELECTOR);
  if (cards === null) return;
  cards.style.maxHeight = '';
  const tops: number[] = [...cards.querySelectorAll<HTMLElement>(CARD_SELECTOR)].map((card: HTMLElement) => card.offsetTop);
  const limit: number | null = pinnedRowsLimit(tops, MAX_LINES);
  // The third line starts one gap below the second, so stopping just above it leaves no sliver of it showing.
  if (limit !== null) cards.style.maxHeight = `${limit - cards.offsetTop - parseFloat(getComputedStyle(cards).rowGap) / 2}px`;
}
