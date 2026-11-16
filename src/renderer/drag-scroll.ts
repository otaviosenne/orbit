// A mouse press that moves less than this is a click on the picture under it, not a pan of the row.
const DRAG_MIN_PX: number = 6;
const DRAGGING_CLASS: string = 'is-dragging';
const PRIMARY_BUTTON: number = 0;

// Pans a sideways scroller by dragging it with the mouse, as touch already does natively. The click that ends a
// drag is swallowed, so letting go over a picture never opens it.
export class DragScroll {
  private startX: number | null = null;
  private startScroll: number = 0;
  private hasDragged: boolean = false;

  constructor(private readonly target: HTMLElement, private readonly isOn: () => boolean) {
    target.addEventListener('pointerdown', (event: PointerEvent): void => this.begin(event));
    target.addEventListener('pointermove', (event: PointerEvent): void => this.move(event));
    target.addEventListener('pointerup', (): void => this.finish());
    target.addEventListener('pointercancel', (): void => this.finish());
    target.addEventListener('click', (event: MouseEvent): void => this.swallowDragClick(event), true);
  }

  private begin(event: PointerEvent): void {
    if (!this.isOn() || event.pointerType !== 'mouse' || event.button !== PRIMARY_BUTTON) return;
    this.startX = event.clientX;
    this.startScroll = this.target.scrollLeft;
    this.hasDragged = false;
  }

  private move(event: PointerEvent): void {
    if (this.startX === null) return;
    const dragX: number = event.clientX - this.startX;
    if (!this.hasDragged && Math.abs(dragX) < DRAG_MIN_PX) return;
    if (!this.hasDragged) {
      this.hasDragged = true;
      this.target.setPointerCapture(event.pointerId);
      this.target.classList.add(DRAGGING_CLASS);
    }
    this.target.scrollLeft = this.startScroll - dragX;
  }

  private finish(): void {
    this.startX = null;
    this.target.classList.remove(DRAGGING_CLASS);
  }

  // Also keeps the scroller's own backdrop click (which closes the viewer) from firing after a drag.
  private swallowDragClick(event: MouseEvent): void {
    if (!this.hasDragged) return;
    this.hasDragged = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
