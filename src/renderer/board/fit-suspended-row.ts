import { isPhoneLayout } from '../host';
import { cardsPerLineOf, suspendedLines } from './suspended-lines';

const CARDS_SELECTOR: string = '.suspended-row .suspended-cards';
const CARD_SELECTOR: string = ':scope > .card';
const LINES_PROPERTY: string = '--suspended-lines';

// Suspended chats are put away: as few lines as fit them (at most two), then the row scrolls sideways so the columns
// keep their height. A phone lists the whole board in one scroll, so there they stack in one column and none are hidden.
export function fitSuspendedRow(root: HTMLElement): void {
  const cards: HTMLElement | null = root.querySelector<HTMLElement>(CARDS_SELECTOR);
  if (cards === null) return;
  applyLines(cards);
  cards.addEventListener('wheel', (event: WheelEvent): void => scrollSideways(cards, event), { passive: false });
  watchWidth(cards);
}

function applyLines(cards: HTMLElement): void {
  const count: number = cards.querySelectorAll(CARD_SELECTOR).length;
  const first: HTMLElement | null = cards.querySelector<HTMLElement>(CARD_SELECTOR);
  const style: CSSStyleDeclaration = getComputedStyle(cards);
  const padding: number = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const perLine: number = first === null ? 1 : cardsPerLineOf(cards.clientWidth - padding, first.offsetWidth, parseFloat(style.columnGap) || 0);
  const lines: number = isPhoneLayout() ? Math.max(count, 1) : suspendedLines(count, perLine);
  cards.style.setProperty(LINES_PROPERTY, String(lines));
}

// Resizing the drawer or the window changes how many cards fit a line; only width matters, since the lines change the height.
function watchWidth(cards: HTMLElement): void {
  let lastWidth: number = cards.clientWidth;
  new ResizeObserver((): void => {
    if (cards.clientWidth === lastWidth) return;
    lastWidth = cards.clientWidth;
    applyLines(cards);
  }).observe(cards);
}

// A mouse wheel turns the row sideways, since the row has nothing to scroll vertically.
function scrollSideways(cards: HTMLElement, event: WheelEvent): void {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || cards.scrollWidth <= cards.clientWidth) return;
  event.preventDefault();
  cards.scrollLeft += event.deltaY;
}
