// Two Space presses this close read as a double tap: under the usual 500 ms double-click interval so separate
// taps rarely merge, yet roomy enough for a relaxed second press.
export const DOUBLE_TAP_MS: number = 350;

// Tells a quick second press of Space from an unrelated one. Callers forget the first press whenever it turns
// into a hold or another key comes between, so typing "a b" never counts.
export class DoubleTap {
  private lastPress: number | null = null;

  constructor(private readonly windowMs: number = DOUBLE_TAP_MS) {}

  // True when this press completes a double tap; the pair is then used up, so a third press starts over.
  press(at: number): boolean {
    const isDouble: boolean = this.lastPress !== null && at >= this.lastPress && at - this.lastPress <= this.windowMs;
    this.lastPress = isDouble ? null : at;
    return isDouble;
  }

  forget(): void {
    this.lastPress = null;
  }
}
