import { isPhoneLayout } from '../host';
import { fitCardRows } from './fit-card-rows';

const CARDS_SELECTOR: string = '.suspended-row .suspended-cards';
// Suspended chats are put away, so they get one compact line and the rest scroll; the columns keep their height.
const MAX_LINES: number = 1;
// A phone lists the whole board in one scroll, so every suspended chat shows there.
const UNCAPPED: number = Number.POSITIVE_INFINITY;

export function fitSuspendedRow(root: HTMLElement): void {
  fitCardRows(root.querySelector<HTMLElement>(CARDS_SELECTOR), isPhoneLayout() ? UNCAPPED : MAX_LINES);
}
