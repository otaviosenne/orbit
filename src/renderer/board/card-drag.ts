import { SESSION_ATTRIBUTE } from '../views/board-view';
import { toCardBox } from './card-boxes';
import type { CardBox } from './card-moves';
import { dragSourceOf } from './drag-source';
import type { DragSource, DropAction } from './drop-rules';
import { DropZones } from './drop-zones';

export interface CardDragHandlers {
  // A press that never became a drag: the card was simply clicked.
  readonly click: (sessionId: string) => void;
  // Only called for a drop that does something; anywhere else the card just goes back. `landing` is where the
  // lifted card was let go, so it can glide on from there.
  readonly drop: (sessionId: string, action: DropAction, landing: CardBox) => void;
  // Called when a drag starts and ends, so the board holds off rebuilding under the pointer.
  readonly changed: () => void;
}

// Further than a hand's tremble, so a click with a slight slip is still a click.
const DRAG_THRESHOLD_PX: number = 6;
const CANCEL_KEY: string = 'Escape';
const CARD_SELECTOR: string = '.board-layout .card';
const DRAG_SOURCE_CLASS: string = 'is-drag-source';
const DRAGGING_BODY_CLASS: string = 'is-dragging-card';

interface Press {
  readonly sessionId: string;
  readonly source: DragSource;
  readonly card: HTMLElement;
  readonly startX: number;
  readonly startY: number;
}

interface Lift {
  readonly ghost: HTMLElement;
  readonly zones: DropZones;
  // Where the card was grabbed, so the ghost stays under the same spot of the card as zones appear around it.
  readonly grabX: number;
  readonly grabY: number;
}

// Any board card can be picked up; what a drop does is decided by the drop rules, and most places do nothing.
export class CardDrag {
  private press: Press | null = null;
  private lift: Lift | null = null;

  constructor(private readonly root: HTMLElement, private readonly handlers: CardDragHandlers) {
    document.addEventListener('pointermove', (event: PointerEvent): void => this.follow(event));
    document.addEventListener('pointerup', (event: PointerEvent): void => this.release(event));
    document.addEventListener('pointercancel', (): void => this.finish());
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CANCEL_KEY && this.lift !== null) this.finish();
    });
  }

  // True while a card is held, so the board is not rebuilt under the pointer.
  get isActive(): boolean {
    return this.press !== null;
  }

  // Takes a press on a board card; anything else is left to the board's usual click handling.
  begin(event: PointerEvent): boolean {
    const card: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(CARD_SELECTOR);
    const source: DragSource | null = card === null ? null : dragSourceOf(card, this.root);
    const sessionId: string | undefined = card?.dataset[SESSION_ATTRIBUTE];
    if (card === null || source === null || sessionId === undefined) return false;
    this.press = { sessionId, source, card, startX: event.clientX, startY: event.clientY };
    this.handlers.changed();
    return true;
  }

  private follow(event: PointerEvent): void {
    if (this.press === null) return;
    if (this.lift === null && !isPastDragThreshold(this.press, event)) return;
    this.lift ??= this.pickUp(this.press);
    this.lift.ghost.style.left = `${event.clientX - this.lift.grabX}px`;
    this.lift.ghost.style.top = `${event.clientY - this.lift.grabY}px`;
    this.lift.zones.hover(event.clientX, event.clientY);
  }

  private release(event: PointerEvent): void {
    const press: Press | null = this.press;
    if (press === null) return;
    const action: DropAction | null = this.lift?.zones.actionAt(event.clientX, event.clientY) ?? null;
    // Measured before finishing, which takes the lifted card away.
    const landing: CardBox | null = this.lift === null ? null : toCardBox(this.lift.ghost.getBoundingClientRect());
    this.finish();
    if (action === null || landing === null) this.handlers.click(press.sessionId);
    else if (action.kind !== 'none') this.handlers.drop(press.sessionId, action, landing);
  }

  // The grab point is measured before the drop zones are drawn, since a new Pinned zone shifts the card.
  private pickUp(press: Press): Lift {
    const box: DOMRect = press.card.getBoundingClientRect();
    const ghost: HTMLElement = press.card.cloneNode(true) as HTMLElement;
    ghost.classList.add('card-ghost');
    ghost.style.width = `${box.width}px`;
    document.body.append(ghost);
    document.body.classList.add(DRAGGING_BODY_CLASS);
    press.card.classList.add(DRAG_SOURCE_CLASS);
    return { ghost, zones: new DropZones(this.root, press.source, press.sessionId), grabX: press.startX - box.left, grabY: press.startY - box.top };
  }

  // The board is rebuilt before the drop zones go: the cards are measured where the user saw them (below a
  // Pinned row drawn only for the drag), so they glide back up instead of jumping.
  private finish(): void {
    const press: Press | null = this.press;
    const lift: Lift | null = this.lift;
    if (press === null) return;
    press.card.classList.remove(DRAG_SOURCE_CLASS);
    document.body.classList.remove(DRAGGING_BODY_CLASS);
    this.lift = null;
    this.press = null;
    this.handlers.changed();
    lift?.ghost.remove();
    lift?.zones.dispose();
  }
}

function isPastDragThreshold(press: Press, event: PointerEvent): boolean {
  return Math.hypot(event.clientX - press.startX, event.clientY - press.startY) >= DRAG_THRESHOLD_PX;
}
