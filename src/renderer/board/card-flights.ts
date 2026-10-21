import { SESSION_ATTRIBUTE } from '../views/board-view';
import { toCardBox } from './card-boxes';
import type { CardBox, CardMove } from './card-moves';

const MOVE_MS: number = 420;
const MOVE_EASING: string = 'cubic-bezier(0.2, 0, 0, 1)';
// The clone is taken down a little after its glide ends; transitionend may never fire in a window that is not
// being painted, and the card would stay hidden.
const SETTLE_MARGIN_MS: number = 80;
const FLIGHT_CLASS: string = 'card-flight';
// Hidden by visibility, not opacity: .card transitions its opacity, so it would dim back in after landing.
const ARRIVING_CLASS: string = 'is-arriving';
// State that belongs to the card on the board, not to a copy flying over it.
const BOARD_ONLY_CLASSES: readonly string[] = ['is-keyboard-focus', 'is-entering', 'is-arriving', 'is-drag-source'];

interface Flight {
  readonly clone: HTMLElement;
  readonly card: HTMLElement;
  readonly timer: number;
}

// Cards that change place fly as copies fixed to the window: a card moved by a transform inside its column
// would be clipped by the column's scrolling box on the way to another one.
export class CardFlights {
  private readonly flights: Map<string, Flight> = new Map();

  // Where each copy in the air is seen right now, so the next render carries on from there.
  positions(): Map<string, CardBox> {
    const boxes: Map<string, CardBox> = new Map();
    this.flights.forEach((flight: Flight, key: string): void => void boxes.set(key, toCardBox(flight.clone.getBoundingClientRect())));
    return boxes;
  }

  // The card waits hidden in its new place while its copy glides there from where it was.
  launch(card: HTMLElement, move: CardMove): void {
    this.land(move.key);
    const clone: HTMLElement = flyingCopy(card, move.to);
    clone.style.transform = `translate(${move.from.left - move.to.left}px, ${move.from.top - move.to.top}px)`;
    document.body.append(clone);
    // Reading layout commits the starting offset before the transition is set; requestAnimationFrame would not
    // run in a window that is not being painted.
    void clone.offsetHeight;
    clone.style.transition = `transform ${MOVE_MS}ms ${MOVE_EASING}`;
    clone.style.transform = '';
    card.classList.add(ARRIVING_CLASS);
    const timer: number = window.setTimeout((): void => this.land(move.key), MOVE_MS + SETTLE_MARGIN_MS);
    this.flights.set(move.key, { clone, card, timer });
  }

  clear(): void {
    [...this.flights.keys()].forEach((key: string): void => this.land(key));
  }

  private land(key: string): void {
    const flight: Flight | undefined = this.flights.get(key);
    if (flight === undefined) return;
    window.clearTimeout(flight.timer);
    flight.clone.remove();
    flight.card.classList.remove(ARRIVING_CLASS);
    this.flights.delete(key);
  }
}

// A copy nothing can find or press: no session (taps, menus and the focus ring look cards up by it), no clicks.
function flyingCopy(card: HTMLElement, box: CardBox): HTMLElement {
  const clone: HTMLElement = card.cloneNode(true) as HTMLElement;
  clone.classList.remove(...BOARD_ONLY_CLASSES);
  clone.classList.add(FLIGHT_CLASS);
  delete clone.dataset[SESSION_ATTRIBUTE];
  clone.setAttribute('aria-hidden', 'true');
  clone.style.left = `${box.left}px`;
  clone.style.top = `${box.top}px`;
  clone.style.width = `${box.width}px`;
  clone.style.height = `${box.height}px`;
  return clone;
}
