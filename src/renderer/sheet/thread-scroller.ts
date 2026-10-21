// Each press moves this much of the visible thread: short, so a tap is a nudge and a held key reads smoothly.
const STEP_FRACTION: number = 0.1;
// Each frame covers this share of what is left to go, which settles a step in about 90 ms at 60 frames a second.
const EASE_PER_FRAME: number = 0.35;
// Closer than this the glide just lands, instead of creeping by fractions of a pixel.
const SETTLE_PX: number = 0.5;

// Alt+↑/↓ scrolling: presses add to one target the thread glides to, so quick taps and a held key (which repeats)
// pile up into a fast, even scroll instead of queueing slow smooth scrolls.
export class ThreadScroller {
  private target: number | null = null;
  private frame: number | null = null;

  constructor(private readonly thread: HTMLElement) {
    // A wheel or a drag takes over; the next press starts from wherever that left the thread.
    thread.addEventListener('wheel', (): void => this.stop(), { passive: true });
  }

  step(direction: 'up' | 'down'): void {
    const amount: number = this.thread.clientHeight * STEP_FRACTION;
    const from: number = this.target ?? this.thread.scrollTop;
    const highest: number = this.thread.scrollHeight - this.thread.clientHeight;
    this.target = Math.min(Math.max(from + (direction === 'up' ? -amount : amount), 0), Math.max(highest, 0));
    this.frame ??= requestAnimationFrame((): void => this.glide());
  }

  private glide(): void {
    if (this.target === null) return this.stop();
    const left: number = this.target - this.thread.scrollTop;
    if (Math.abs(left) <= SETTLE_PX) {
      this.thread.scrollTop = this.target;
      return this.stop();
    }
    this.thread.scrollTop += left * EASE_PER_FRAME;
    this.frame = requestAnimationFrame((): void => this.glide());
  }

  private stop(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.target = null;
  }
}
