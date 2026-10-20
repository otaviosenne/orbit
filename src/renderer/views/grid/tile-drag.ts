import type { Point, SlotRect } from './drop-target';
import { dropIndexAt } from './drop-target';
import { TILE_SESSION_ATTRIBUTE } from './grid-tile';

export type TileDrop = (sessionId: string, targetId: string) => void;

const PRIMARY_BUTTON: number = 0;
// A press that moves less than this is a click on the header, not a drag.
const DRAG_THRESHOLD_PX: number = 5;
// Dragging this close to the scroller's top or bottom edge scrolls it, to reach tiles off screen.
const EDGE_SCROLL_ZONE_PX: number = 48;
const EDGE_SCROLL_STEP_PX: number = 16;
const HEADER_SELECTOR: string = '.tile-header';
const TILE_SELECTOR: string = '[data-grid-session]';
const DRAGGING_CLASS: string = 'is-dragging';
const DROP_TARGET_CLASS: string = 'is-drop-target';
const REORDERING_CLASS: string = 'is-reordering';

interface Press {
  readonly tile: HTMLElement;
  readonly pointerId: number;
  readonly start: Point;
  readonly startScroll: number;
  isDragging: boolean;
  // Tiles and their slots in scroll-content coordinates, measured once when the drag starts; nothing moves until the drop.
  tiles: HTMLElement[];
  slots: SlotRect[];
  target: HTMLElement | null;
}

// Drags a tile by its header: the tile follows the pointer, the tile whose place it would take is highlighted,
// and releasing there reorders. Presses on the header's buttons stay clicks.
export class TileDrag {
  private press: Press | null = null;

  constructor(private readonly area: HTMLElement, private readonly scroller: HTMLElement, private readonly onDrop: TileDrop) {
    area.addEventListener('pointerdown', (event: PointerEvent): void => this.begin(event));
    area.addEventListener('pointermove', (event: PointerEvent): void => this.move(event));
    area.addEventListener('pointerup', (event: PointerEvent): void => this.end(event, true));
    area.addEventListener('pointercancel', (event: PointerEvent): void => this.end(event, false));
    area.addEventListener('lostpointercapture', (event: PointerEvent): void => this.end(event, false));
  }

  get isActive(): boolean {
    return this.press?.isDragging ?? false;
  }

  private begin(event: PointerEvent): void {
    if (event.button !== PRIMARY_BUTTON || this.press !== null) return;
    const target: Element = event.target as Element;
    if (target.closest('button') !== null) return;
    const header: HTMLElement | null = target.closest<HTMLElement>(HEADER_SELECTOR);
    const tile: HTMLElement | null = header?.closest<HTMLElement>(TILE_SELECTOR) ?? null;
    if (header === null || tile === null) return;
    // No text selection or focus change while the header is held.
    event.preventDefault();
    header.setPointerCapture(event.pointerId);
    this.press = {
      tile,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      startScroll: this.scroller.scrollTop,
      isDragging: false,
      tiles: [],
      slots: [],
      target: null,
    };
  }

  private move(event: PointerEvent): void {
    const press: Press | null = this.press;
    if (press === null || event.pointerId !== press.pointerId) return;
    if (!press.isDragging && !this.passedThreshold(press, event)) return;
    if (!press.isDragging) this.startDragging(press);
    this.scrollNearEdges(event.clientY);
    this.follow(press, event);
    this.highlightTarget(press, event);
  }

  private end(event: PointerEvent, shouldDrop: boolean): void {
    const press: Press | null = this.press;
    if (press === null || event.pointerId !== press.pointerId) return;
    this.press = null;
    if (!press.isDragging) return;
    this.clear(press);
    const sessionId: string | undefined = press.tile.dataset[TILE_SESSION_ATTRIBUTE];
    const targetId: string | undefined = press.target?.dataset[TILE_SESSION_ATTRIBUTE];
    if (shouldDrop && sessionId !== undefined && targetId !== undefined) this.onDrop(sessionId, targetId);
  }

  private passedThreshold(press: Press, event: PointerEvent): boolean {
    return Math.hypot(event.clientX - press.start.x, event.clientY - press.start.y) >= DRAG_THRESHOLD_PX;
  }

  private startDragging(press: Press): void {
    press.isDragging = true;
    press.tiles = [...this.area.querySelectorAll<HTMLElement>(TILE_SELECTOR)];
    press.slots = press.tiles.map((tile: HTMLElement) => this.contentRect(tile.getBoundingClientRect()));
    press.tile.classList.add(DRAGGING_CLASS);
    this.area.classList.add(REORDERING_CLASS);
  }

  private contentRect(rect: DOMRect): SlotRect {
    const scroll: number = this.scroller.scrollTop;
    return { left: rect.left, right: rect.right, top: rect.top + scroll, bottom: rect.bottom + scroll };
  }

  private scrollNearEdges(clientY: number): void {
    const bounds: DOMRect = this.scroller.getBoundingClientRect();
    if (clientY < bounds.top + EDGE_SCROLL_ZONE_PX) this.scroller.scrollTop -= EDGE_SCROLL_STEP_PX;
    else if (clientY > bounds.bottom - EDGE_SCROLL_ZONE_PX) this.scroller.scrollTop += EDGE_SCROLL_STEP_PX;
  }

  // The tile scrolls with the content, so the scroll since the press is added back to keep it under the pointer.
  private follow(press: Press, event: PointerEvent): void {
    const dx: number = event.clientX - press.start.x;
    const dy: number = event.clientY - press.start.y + (this.scroller.scrollTop - press.startScroll);
    press.tile.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private highlightTarget(press: Press, event: PointerEvent): void {
    const index: number | null = dropIndexAt(press.slots, { x: event.clientX, y: event.clientY + this.scroller.scrollTop });
    const candidate: HTMLElement | null = index === null ? null : (press.tiles[index] ?? null);
    const target: HTMLElement | null = candidate === press.tile ? null : candidate;
    if (target === press.target) return;
    press.target?.classList.remove(DROP_TARGET_CLASS);
    target?.classList.add(DROP_TARGET_CLASS);
    press.target = target;
  }

  private clear(press: Press): void {
    press.tile.classList.remove(DRAGGING_CLASS);
    press.tile.style.removeProperty('transform');
    press.target?.classList.remove(DROP_TARGET_CLASS);
    this.area.classList.remove(REORDERING_CLASS);
  }
}
