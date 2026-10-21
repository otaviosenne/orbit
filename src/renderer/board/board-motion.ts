import { captureBoardScroll, restoreBoardScroll } from './board-scroll';
import type { BoardScroll } from './board-scroll';
import { cardsByKey, visibleBoxes } from './card-boxes';
import { CardFlights } from './card-flights';
import type { CardBox, CardBoxes, CardMove } from './card-moves';
import { cardMoves, enteringCards, seenBoxes } from './card-moves';

// Sub-pixel shifts from rounding are not moves; flying them would only make the board shimmer on every poll.
const MIN_MOVE_PX: number = 1;
const ENTERING_CLASS: string = 'is-entering';
const BOARD_SELECTOR: string = '.board-layout';
const REDUCED_MOTION: string = '(prefers-reduced-motion: reduce)';

// The board is rebuilt from scratch on every render; this makes a card that changed column or place glide there
// from where it was seen, and a new card fade in, instead of both teleporting.
export class BoardMotion {
  private readonly flights: CardFlights = new CardFlights();
  private readonly landings: Map<string, CardBox> = new Map();

  // A dropped card starts its glide from where it was let go, not from the slot it was picked up from.
  land(key: string | null, box: CardBox): void {
    if (key !== null) this.landings.set(key, box);
  }

  replace(root: HTMLElement, layout: HTMLElement): void {
    const before: CardBoxes | null = this.seenBefore(root);
    const scroll: BoardScroll = captureBoardScroll(root);
    this.flights.clear();
    this.landings.clear();
    root.replaceChildren(layout);
    restoreBoardScroll(root, scroll);
    if (before !== null && !matchMedia(REDUCED_MOTION).matches) this.play(root, before);
  }

  // Null when the board was not on screen (first load, or back from another view): nothing moved then.
  private seenBefore(root: HTMLElement): CardBoxes | null {
    if (root.querySelector(BOARD_SELECTOR) === null) return null;
    return seenBoxes(seenBoxes(visibleBoxes(cardsByKey(root)), this.flights.positions()), this.landings);
  }

  private play(root: HTMLElement, before: CardBoxes): void {
    const cards: Map<string, HTMLElement> = cardsByKey(root);
    const after: CardBoxes = visibleBoxes(cards);
    cardMoves(before, after, MIN_MOVE_PX).forEach((move: CardMove): void => {
      const card: HTMLElement | undefined = cards.get(move.key);
      if (card !== undefined) this.flights.launch(card, move);
    });
    enteringCards(before, after).forEach((key: string): void => void cards.get(key)?.classList.add(ENTERING_CLASS));
  }
}
