import { DROP_ZONE_SELECTOR, SESSION_ATTRIBUTE } from '../views/board-view';
import type { CardArea } from './card-keys';
import { cardKeyFor } from './card-keys';
import type { CardBox } from './card-moves';

const CARD_SELECTOR: string = `.board-layout .card[data-${SESSION_ATTRIBUTE}]`;
const PINNED_ROW_SELECTOR: string = '.pinned-row';

export function cardsByKey(root: HTMLElement): Map<string, HTMLElement> {
  const cards: Map<string, HTMLElement> = new Map();
  root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((card: HTMLElement): void => void cards.set(cardKeyOf(card), card));
  return cards;
}

function cardKeyOf(card: HTMLElement): string {
  const area: CardArea = card.closest(PINNED_ROW_SELECTOR) === null ? 'board' : 'pinned';
  return cardKeyFor(area, card.dataset[SESSION_ATTRIBUTE] ?? '');
}

// Only cards showing inside their column count: one scrolled out of sight was not seen anywhere, so it fades in
// rather than flying out of a column's hidden part.
export function visibleBoxes(cards: ReadonlyMap<string, HTMLElement>): Map<string, CardBox> {
  const boxes: Map<string, CardBox> = new Map();
  cards.forEach((card: HTMLElement, key: string): void => {
    const box: DOMRect = card.getBoundingClientRect();
    const zone: HTMLElement | null = card.parentElement?.closest<HTMLElement>(DROP_ZONE_SELECTOR) ?? null;
    if (zone === null || overlaps(box, zone.getBoundingClientRect())) boxes.set(key, toCardBox(box));
  });
  return boxes;
}

export function toCardBox(box: DOMRect): CardBox {
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}
