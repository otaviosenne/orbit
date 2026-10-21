import { zoneOf } from './drag-source';
import type { BoardZone } from './drop-rules';

// The board's own scrollers: each column, and the Pinned row sideways.
const SCROLLER_SELECTOR: string = '.column, .pinned-cards';

interface ScrollPosition {
  readonly top: number;
  readonly left: number;
}

export type BoardScroll = ReadonlyMap<BoardZone, ScrollPosition>;

// The board is rebuilt on every poll; without this a scrolled column jumps back to the top, and its cards would
// seem to move on every poll.
export function captureBoardScroll(root: HTMLElement): BoardScroll {
  const positions: Map<BoardZone, ScrollPosition> = new Map();
  root.querySelectorAll<HTMLElement>(SCROLLER_SELECTOR).forEach((scroller: HTMLElement): void => {
    const zone: BoardZone | null = zoneOf(scroller);
    if (zone !== null) positions.set(zone, { top: scroller.scrollTop, left: scroller.scrollLeft });
  });
  return positions;
}

export function restoreBoardScroll(root: HTMLElement, positions: BoardScroll): void {
  root.querySelectorAll<HTMLElement>(SCROLLER_SELECTOR).forEach((scroller: HTMLElement): void => {
    const zone: BoardZone | null = zoneOf(scroller);
    const position: ScrollPosition | undefined = zone === null ? undefined : positions.get(zone);
    if (position === undefined) return;
    scroller.scrollTop = position.top;
    scroller.scrollLeft = position.left;
  });
}
