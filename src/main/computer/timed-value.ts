// A value read at most once per `ttlMs`: the desktop window and a phone polling together share one read, and a
// read still running is joined instead of started again.
export class TimedValue<T> {
  private value: Promise<T> | null = null;
  private readAt: number = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly read: () => Promise<T>,
    private readonly now: () => number = Date.now,
  ) {}

  get(): Promise<T> {
    if (this.value === null || this.now() - this.readAt >= this.ttlMs) {
      this.readAt = this.now();
      this.value = this.read();
    }
    return this.value;
  }

  // After an action changed it, the next look reads it again.
  invalidate(): void {
    this.value = null;
  }
}
