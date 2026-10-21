// How close to the list's top or bottom edge a dragged row has to be to scroll it, and how fast.
const EDGE_PX: number = 56;
const STEP_PX: number = 10;
const TICK_MS: number = 16;

// While a row is held near an edge, the list keeps scrolling even with the finger still, so a row can travel
// past the part of a long list that is on screen. Each step reports back so the drag can follow.
export class EdgeScroll {
  private timer: number | null = null;
  private direction: -1 | 0 | 1 = 0;

  constructor(private readonly scroller: HTMLElement, private readonly scrolled: () => void) {}

  follow(clientY: number): void {
    this.direction = edgeDirection(this.scroller.getBoundingClientRect(), clientY);
    if (this.direction === 0) return this.stop();
    this.timer ??= window.setInterval((): void => this.step(), TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private step(): void {
    const before: number = this.scroller.scrollTop;
    this.scroller.scrollTop += this.direction * STEP_PX;
    if (this.scroller.scrollTop === before) return this.stop();
    this.scrolled();
  }
}

function edgeDirection(box: DOMRect, clientY: number): -1 | 0 | 1 {
  if (clientY < box.top + EDGE_PX) return -1;
  if (clientY > box.bottom - EDGE_PX) return 1;
  return 0;
}
