const LEVEL_PROPERTY: string = '--voice-level';
// Each frame moves this much of the way toward the new level, so the pulse follows speech without jitter.
const SMOOTHING: number = 0.3;
const LEVEL_DIGITS: number = 3;

export type LevelSource = () => number;

// Mirrors the microphone level into a CSS variable every frame while dictating.
export class VoiceMeter {
  private frame: number | undefined;
  private level: number = 0;

  constructor(private readonly target: HTMLElement) {}

  start(read: LevelSource): void {
    this.stop();
    const tick = (): void => {
      this.level += (read() - this.level) * SMOOTHING;
      this.target.style.setProperty(LEVEL_PROPERTY, this.level.toFixed(LEVEL_DIGITS));
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.level = 0;
    this.target.style.setProperty(LEVEL_PROPERTY, '0');
  }
}
