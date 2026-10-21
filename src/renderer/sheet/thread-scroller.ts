// Each press moves this much of the visible thread: short, so a tap is a nudge and a held key reads smoothly.
const STEP_FRACTION: number = 0.1;
// Each frame covers this share of what is left to go, which settles a step in about 90 ms at 60 frames a second.
const EASE_PER_FRAME: number = 0.35;
// Closer than this the glide just lands, instead of creeping by fractions of a pixel.
const SETTLE_PX: number = 1;

// Alt+↑/↓ scrolling: presses add to the distance still to travel, and the thread glides through it, so quick taps and a
// held key (which repeats) pile up into a fast, even scroll. It tracks distance, not a position: older pages loaded
// above the view shift scrollTop to keep the place, and an absolute target would chase that shift up the whole history.
export class ThreadScroller {
  private remaining: number = 0;
  private frame: number | null = null;

  constructor(private readonly thread: HTMLElement) {
    // A wheel or a drag takes over; the next press starts from wherever that left the thread.
    thread.addEventListener('wheel', (): void => this.stop(), { passive: true });
  }

  step(direction: 'up' | 'down'): void {
    const amount: number = this.thread.clientHeight * STEP_FRACTION;
    this.remaining += direction === 'up' ? -amount : amount;
    this.frame ??= requestAnimationFrame((): void => this.glide());
  }

  private glide(): void {
    const move: number = Math.abs(this.remaining) <= SETTLE_PX ? this.remaining : this.remaining * EASE_PER_FRAME;
    const before: number = this.thread.scrollTop;
    this.thread.scrollTop = before + move;
    // What this frame really covered (the browser rounds, an end clamps); a page loaded above shifts scrollTop
    // between frames, never within this assignment, so it is never counted as travel.
    const moved: number = this.thread.scrollTop - before;
    this.remaining -= moved;
    // At the top or bottom nothing moves; whatever was left to go is dropped instead of waiting there.
    if (moved === 0 || Math.abs(this.remaining) <= SETTLE_PX / 2) return this.stop();
    this.frame = requestAnimationFrame((): void => this.glide());
  }

  private stop(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.remaining = 0;
  }
}
