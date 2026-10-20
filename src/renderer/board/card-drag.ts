import type { RestingColumn } from '../views/board-columns';

export interface CardDragHandlers {
  // A press that never became a drag: the card was simply clicked.
  readonly click: (sessionId: string) => void;
  readonly move: (sessionId: string, to: RestingColumn) => void;
  // Called when a drag starts and ends, so the board holds off rebuilding under the pointer.
  readonly changed: () => void;
}

// Further than a hand's tremble, so a click with a slight slip is still a click.
const DRAG_THRESHOLD_PX: number = 6;
const CANCEL_KEY: string = 'Escape';
const DRAG_SOURCE_CLASS: string = 'is-drag-source';
const DROP_TARGET_CLASS: string = 'is-drop-target';
const DRAGGING_BODY_CLASS: string = 'is-dragging-card';

interface Press {
  readonly sessionId: string;
  readonly from: RestingColumn;
  readonly card: HTMLElement;
  readonly startX: number;
  readonly startY: number;
}

// Cards in Active and Idle can be dragged to the other of the two; no other column takes them.
export class CardDrag {
  private press: Press | null = null;
  private ghost: HTMLElement | null = null;
  private target: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement, private readonly handlers: CardDragHandlers) {
    document.addEventListener('pointermove', (event: PointerEvent): void => this.follow(event));
    document.addEventListener('pointerup', (event: PointerEvent): void => this.release(event));
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CANCEL_KEY && this.ghost !== null) this.finish();
    });
  }

  // True while a card is held, so the board is not rebuilt under the pointer.
  get isActive(): boolean {
    return this.press !== null;
  }

  // Takes a press on an Active or Idle card; anything else is left to the board's usual click handling.
  begin(event: PointerEvent): boolean {
    const card: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>('.board .card');
    const from: RestingColumn | null = card === null ? null : columnOf(card);
    const sessionId: string | undefined = card?.dataset['session'];
    if (card === null || from === null || sessionId === undefined) return false;
    this.press = { sessionId, from, card, startX: event.clientX, startY: event.clientY };
    this.handlers.changed();
    return true;
  }

  private follow(event: PointerEvent): void {
    if (this.press === null) return;
    if (this.ghost === null && Math.hypot(event.clientX - this.press.startX, event.clientY - this.press.startY) < DRAG_THRESHOLD_PX) return;
    if (this.ghost === null) this.lift(this.press);
    this.placeGhost(event);
    this.markTarget(event);
  }

  private release(event: PointerEvent): void {
    const press: Press | null = this.press;
    if (press === null) return;
    const wasDragging: boolean = this.ghost !== null;
    const droppedOn: boolean = this.isOverTarget(event);
    this.finish();
    if (!wasDragging) this.handlers.click(press.sessionId);
    else if (droppedOn) this.handlers.move(press.sessionId, otherColumn(press.from));
  }

  private lift(press: Press): void {
    const box: DOMRect = press.card.getBoundingClientRect();
    const ghost: HTMLElement = press.card.cloneNode(true) as HTMLElement;
    ghost.classList.add('card-ghost');
    ghost.style.width = `${box.width}px`;
    document.body.append(ghost);
    document.body.classList.add(DRAGGING_BODY_CLASS);
    press.card.classList.add(DRAG_SOURCE_CLASS);
    this.ghost = ghost;
    this.target = this.root.querySelector<HTMLElement>(`.column-${otherColumn(press.from)}`);
  }

  private placeGhost(event: PointerEvent): void {
    if (this.ghost === null || this.press === null) return;
    const box: DOMRect = this.press.card.getBoundingClientRect();
    this.ghost.style.left = `${event.clientX - (this.press.startX - box.left)}px`;
    this.ghost.style.top = `${event.clientY - (this.press.startY - box.top)}px`;
  }

  private markTarget(event: PointerEvent): void {
    this.target?.classList.toggle(DROP_TARGET_CLASS, this.isOverTarget(event));
  }

  private isOverTarget(event: PointerEvent): boolean {
    if (this.target === null) return false;
    const box: DOMRect = this.target.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
  }

  private finish(): void {
    this.ghost?.remove();
    this.press?.card.classList.remove(DRAG_SOURCE_CLASS);
    this.target?.classList.remove(DROP_TARGET_CLASS);
    document.body.classList.remove(DRAGGING_BODY_CLASS);
    this.ghost = null;
    this.target = null;
    this.press = null;
    this.handlers.changed();
  }
}

function columnOf(card: HTMLElement): RestingColumn | null {
  if (card.closest('.column-active') !== null) return 'active';
  if (card.closest('.column-idle') !== null) return 'idle';
  return null;
}

function otherColumn(column: RestingColumn): RestingColumn {
  return column === 'active' ? 'idle' : 'active';
}
