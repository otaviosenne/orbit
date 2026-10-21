import { EdgeScroll } from './edge-scroll';
import { slotShift, targetIndex } from './drop-slot';
import { LIST_SESSION_ATTRIBUTE, ROW_SELECTOR } from './list-row';

export interface RowDragHost {
  // The <ol> holding the rows, and the element that scrolls them.
  readonly list: HTMLElement;
  readonly scroller: HTMLElement;
  // Only the manual order can be changed by hand.
  readonly canReorder: () => boolean;
  // A press that never became a drag: the row was simply clicked.
  readonly open: (sessionId: string) => void;
  // Called while the dragged row still sits under the pointer, so the move can glide from where it is seen.
  readonly drop: (sessionId: string, from: number, to: number) => void;
  // Called when a press starts and ends, so the list is not redrawn under the pointer meanwhile.
  readonly changed: () => void;
}

// Long enough that a touch meant as a scroll or a tap never lifts a row; short enough not to feel like waiting.
const HOLD_MS: number = 350;
// A finger or mouse that slips this little is still holding still.
const MOVE_TOLERANCE_PX: number = 8;
const HOLD_VIBRATION_MS: number = 10;
const PRIMARY_BUTTON: number = 0;
const MOUSE: string = 'mouse';
const TOUCH: string = 'touch';
const CANCEL_KEY: string = 'Escape';
const LIFTED_CLASS: string = 'is-lifted';
const REORDERING_CLASS: string = 'is-reordering';
const DRAGGING_BODY_CLASS: string = 'is-dragging-row';

interface Press {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly sessionId: string;
  readonly item: HTMLElement;
  readonly startX: number;
  readonly startY: number;
  // Where the pointer went down inside the list, so the row keeps following it while the list scrolls.
  readonly startInList: number;
  readonly downAt: number;
  readonly timer: number;
  lastY: number;
}

interface Lift {
  readonly rows: readonly HTMLElement[];
  readonly from: number;
  readonly midpoints: readonly number[];
  readonly step: number;
  to: number;
}

// Press and hold a row, then drag it up or down: the other rows step aside, and letting go puts it there. A mouse
// may also start dragging by simply moving, but a finger that moves before the hold is scrolling the list.
export class RowDrag {
  private press: Press | null = null;
  private lift: Lift | null = null;
  private readonly edge: EdgeScroll;

  constructor(private readonly host: RowDragHost) {
    this.edge = new EdgeScroll(host.scroller, (): void => this.track());
    host.list.addEventListener('pointerdown', (event: PointerEvent): void => this.begin(event));
    document.addEventListener('pointermove', (event: PointerEvent): void => this.follow(event));
    document.addEventListener('pointerup', (event: PointerEvent): void => this.release(event));
    document.addEventListener('pointercancel', (event: PointerEvent): void => this.cancel(event));
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CANCEL_KEY && this.lift !== null) this.finish(true);
    });
    // Once a row is lifted the finger drags it, so the page must not pan; before that it may.
    host.scroller.addEventListener('touchmove', (event: TouchEvent): void => {
      if (this.lift !== null) event.preventDefault();
    }, { passive: false });
    // Android answers a long press with a context menu, which would end the drag.
    host.scroller.addEventListener('contextmenu', (event: MouseEvent): void => {
      if (this.press !== null) event.preventDefault();
    });
  }

  // True from the press until it is released, so the list is not redrawn under the pointer.
  get isPressed(): boolean {
    return this.press !== null;
  }

  private begin(event: PointerEvent): void {
    const item: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(ROW_SELECTOR);
    const sessionId: string | undefined = item?.dataset[LIST_SESSION_ATTRIBUTE];
    if (item === null || sessionId === undefined || event.button !== PRIMARY_BUTTON || this.press !== null) return;
    // Hidden windows run timers late, so the hold is also checked against the clock on every move.
    const timer: number = window.setTimeout((): void => this.liftOnHold(), HOLD_MS);
    const startInList: number = event.clientY - this.host.list.getBoundingClientRect().top;
    this.press = { pointerId: event.pointerId, pointerType: event.pointerType, sessionId, item, startX: event.clientX, startY: event.clientY, startInList, downAt: event.timeStamp, timer, lastY: event.clientY };
    this.host.changed();
  }

  private follow(event: PointerEvent): void {
    const press: Press | null = this.press;
    if (press === null || event.pointerId !== press.pointerId) return;
    press.lastY = event.clientY;
    if (this.lift !== null) return this.track();
    const moved: boolean = Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > MOVE_TOLERANCE_PX;
    const held: boolean = event.timeStamp - press.downAt >= HOLD_MS;
    if (this.host.canReorder() && (held || (moved && press.pointerType === MOUSE))) return this.pickUp(press);
    // A scroll or a slip: neither a click nor a drag.
    if (moved) this.finish(true);
  }

  private liftOnHold(): void {
    if (this.press !== null && this.lift === null && this.host.canReorder()) this.pickUp(this.press);
  }

  private pickUp(press: Press): void {
    const rows: HTMLElement[] = [...this.host.list.querySelectorAll<HTMLElement>(ROW_SELECTOR)];
    const from: number = rows.indexOf(press.item);
    if (from === -1) return this.finish(true);
    // Layout offsets, not on-screen boxes: a glide still in flight from the last poll must not skew the slots.
    const midpoints: number[] = rows.map((row: HTMLElement) => row.offsetTop + row.offsetHeight / 2);
    for (const row of rows) row.style.transition = '';
    press.item.style.transition = 'none';
    press.item.classList.add(LIFTED_CLASS);
    this.host.list.classList.add(REORDERING_CLASS);
    document.body.classList.add(DRAGGING_BODY_CLASS);
    if (press.pointerType === TOUCH) navigator.vibrate?.(HOLD_VIBRATION_MS);
    this.lift = { rows, from, midpoints, step: press.item.offsetHeight, to: from };
    this.track();
  }

  // Moves the lifted row with the pointer and lets the others step aside for where it would land.
  private track(): void {
    const press: Press | null = this.press;
    const lift: Lift | null = this.lift;
    if (press === null || lift === null) return;
    const offset: number = this.clampedOffset(press, press.lastY - this.host.list.getBoundingClientRect().top - press.startInList);
    press.item.style.transform = `translateY(${offset}px)`;
    const to: number = targetIndex(lift.midpoints, lift.from, (lift.midpoints[lift.from] ?? 0) + offset);
    if (to !== lift.to) this.makeRoom(lift, to);
    this.edge.follow(press.lastY);
  }

  // The row stays within the list, so it cannot be dragged off into the empty space under the last row.
  private clampedOffset(press: Press, offset: number): number {
    const lowest: number = -press.item.offsetTop;
    const highest: number = this.host.list.clientHeight - press.item.offsetTop - press.item.offsetHeight;
    return Math.min(Math.max(offset, lowest), Math.max(highest, lowest));
  }

  private makeRoom(lift: Lift, to: number): void {
    lift.to = to;
    lift.rows.forEach((row: HTMLElement, index: number): void => {
      if (index === lift.from) return;
      const shift: number = slotShift(index, lift.from, to);
      row.style.transform = shift === 0 ? '' : `translateY(${shift * lift.step}px)`;
    });
  }

  private release(event: PointerEvent): void {
    const press: Press | null = this.press;
    if (press === null || event.pointerId !== press.pointerId) return;
    const lift: Lift | null = this.lift;
    if (lift === null) {
      this.finish(true);
      this.host.open(press.sessionId);
      return;
    }
    // The host lays the rows out again from here, so their offsets are left for it to replace.
    this.host.drop(press.sessionId, lift.from, lift.to);
    this.finish(false);
  }

  private cancel(event: PointerEvent): void {
    if (this.press !== null && event.pointerId === this.press.pointerId) this.finish(true);
  }

  // restore: the rows slide back to where they were (a cancelled drag, or a press that was a click or a scroll).
  private finish(restore: boolean): void {
    const press: Press | null = this.press;
    if (press === null) return;
    window.clearTimeout(press.timer);
    this.edge.stop();
    if (this.lift !== null) this.putDown(press, this.lift, restore);
    this.press = null;
    this.lift = null;
    this.host.changed();
  }

  private putDown(press: Press, lift: Lift, restore: boolean): void {
    press.item.classList.remove(LIFTED_CLASS);
    this.host.list.classList.remove(REORDERING_CLASS);
    document.body.classList.remove(DRAGGING_BODY_CLASS);
    if (!restore) return;
    for (const row of lift.rows) {
      row.style.transition = '';
      row.style.transform = '';
    }
  }
}
