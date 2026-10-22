import { isPhoneLayout } from '../host';
import { cardsPerLineOf, suspendedScrolls } from './suspended-lines';

const CARDS_SELECTOR: string = '.suspended-row .suspended-cards';
const CARD_SELECTOR: string = ':scope > .card';
const COLUMNS_PROPERTY: string = '--suspended-columns';
const SCROLLING_CLASS: string = 'is-scrolling';

// Suspended chats are put away: they wrap like Pinned for up to two lines, then the row scrolls sideways so the columns
// keep their height. A phone lists the whole board in one scroll, so there they stack in one column and none are hidden.
export function fitSuspendedRow(root: HTMLElement): void {
  const cards: HTMLElement | null = root.querySelector<HTMLElement>(CARDS_SELECTOR);
  if (cards === null) return;
  applyLayout(cards);
  cards.addEventListener('wheel', (event: WheelEvent): void => scrollSideways(cards, event), { passive: false });
  watchWidth(cards);
}

function applyLayout(cards: HTMLElement): void {
  const count: number = cards.querySelectorAll(CARD_SELECTOR).length;
  const first: HTMLElement | null = cards.querySelector<HTMLElement>(CARD_SELECTOR);
  const style: CSSStyleDeclaration = getComputedStyle(cards);
  const padding: number = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const perLine: number = first === null ? 1 : cardsPerLineOf(cards.clientWidth - padding, first.offsetWidth, parseFloat(style.columnGap) || 0);
  const columns: number = isPhoneLayout() ? 1 : perLine;
  cards.style.setProperty(COLUMNS_PROPERTY, String(columns));
  cards.classList.toggle(SCROLLING_CLASS, !isPhoneLayout() && suspendedScrolls(count, perLine));
}

// Resizing the drawer or the window changes how many cards fit a line; only width matters, since the lines change the height.
function watchWidth(cards: HTMLElement): void {
  let lastWidth: number = cards.clientWidth;
  new ResizeObserver((): void => {
    if (cards.clientWidth === lastWidth) return;
    lastWidth = cards.clientWidth;
    applyLayout(cards);
  }).observe(cards);
}

// A mouse wheel turns the row sideways, since the row has nothing to scroll vertically.
function scrollSideways(cards: HTMLElement, event: WheelEvent): void {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || cards.scrollWidth <= cards.clientWidth) return;
  event.preventDefault();
  cards.scrollLeft += event.deltaY;
}
