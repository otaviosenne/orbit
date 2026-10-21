import type { CaretPoint } from './caret-point';
import { caretPoint } from './caret-point';
import type { LevelSource } from './voice-meter';
import { VoiceMeter } from './voice-meter';

// While dictating: animated bars stand in for the caret, and the composer pulses with the voice level.
export class VoiceVisuals {
  private readonly meter: VoiceMeter;

  constructor(
    box: HTMLElement,
    private readonly input: HTMLTextAreaElement,
    private readonly bars: HTMLElement,
    private readonly readLevel: LevelSource,
  ) {
    this.meter = new VoiceMeter(box);
    input.addEventListener('scroll', (): void => this.placeBars());
    // The bars mark where the next words land, so they follow the caret through deletions, typing and clicks too.
    input.addEventListener('input', (): void => this.placeBars());
    document.addEventListener('selectionchange', (): void => {
      if (document.activeElement === input) this.placeBars();
    });
  }

  show(): void {
    this.bars.hidden = false;
    this.placeBars();
    this.meter.start(this.readLevel);
  }

  hide(): void {
    this.bars.hidden = true;
    this.meter.stop();
  }

  // Follows the caret as live words push it forward.
  placeBars(): void {
    if (this.bars.hidden) return;
    const point: CaretPoint = caretPoint(this.input, this.input.selectionEnd);
    this.bars.style.transform = `translate(${this.input.offsetLeft + point.left}px, ${this.input.offsetTop + point.top}px)`;
    this.bars.style.height = `${point.height}px`;
  }
}
