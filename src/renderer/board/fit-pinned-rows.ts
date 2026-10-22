import { fitCardRows } from './fit-card-rows';

const CARDS_SELECTOR: string = '.pinned-row .pinned-cards';
// Two lines of pinned cards, then the row scrolls instead of pushing the columns down.
const MAX_LINES: number = 2;

export function fitPinnedRows(root: HTMLElement): void {
  fitCardRows(root.querySelector<HTMLElement>(CARDS_SELECTOR), MAX_LINES);
}
