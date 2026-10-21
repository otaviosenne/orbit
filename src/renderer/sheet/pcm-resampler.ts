// Floating-point slack when a window's width is reached in fractional steps.
const EPSILON: number = 1e-9;

// Turns audio at the device's rate into the voice service's rate as it streams. Each output sample is the average of
// the input span it covers (a box filter, enough to keep a 48 kHz microphone's highs from folding into speech), and
// the part of a span left at the end of one chunk carries into the next, so chunk sizes never change the result.
export class PcmResampler {
  // Input samples per output sample.
  private readonly step: number;
  private sum: number = 0;
  private filled: number = 0;

  constructor(readonly fromRate: number, readonly toRate: number) {
    this.step = fromRate / toRate;
  }

  get isPassThrough(): boolean {
    return this.fromRate === this.toRate;
  }

  process(input: Float32Array): Float32Array {
    if (this.isPassThrough) return input;
    const output: number[] = [];
    for (const sample of input) this.take(sample, output);
    return Float32Array.from(output);
  }

  // One input sample spans width 1; it may close the current output window and start the next.
  private take(sample: number, output: number[]): void {
    let left: number = 1;
    while (left > EPSILON) {
      const portion: number = Math.min(left, this.step - this.filled);
      this.sum += sample * portion;
      this.filled += portion;
      left -= portion;
      if (this.filled >= this.step - EPSILON) {
        output.push(this.sum / this.step);
        this.sum = 0;
        this.filled = 0;
      }
    }
  }
}
