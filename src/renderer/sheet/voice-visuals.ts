import type { CaretPoint } from './caret-point';
import { caretPoint } from './caret-point';
import type { LevelSource } from './voice-meter';
import { VoiceMeter } from './voice-meter';

// While dictating: animated bars stand in for the caret, and the composer pulses with the voice level.
export class VoiceVisuals {
  private readonly meter: VoiceMeter;
  private watchFrame: number | null = null;
  private lastLayout: string = '';

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
    this.watchCaret();
  }

  hide(): void {
    this.bars.hidden = true;
    this.meter.stop();
    if (this.watchFrame !== null) cancelAnimationFrame(this.watchFrame);
    this.watchFrame = null;
  }

  // Sending or restoring a draft sets the text from code, which fires no event; checking each frame while the bars
  // show keeps them on the caret whatever changed the field, at the cost of a string compare when nothing did.
  private watchCaret(): void {
    if (this.watchFrame !== null) return;
    const tick = (): void => {
      const layout: string = `${this.input.value.length}:${this.input.selectionEnd}:${this.input.scrollTop}:${this.input.offsetHeight}`;
      if (layout !== this.lastLayout) {
        this.lastLayout = layout;
        this.placeBars();
      }
      this.watchFrame = requestAnimationFrame(tick);
    };
    this.watchFrame = requestAnimationFrame(tick);
  }

  // Follows the caret as live words push it forward.
  placeBars(): void {
    if (this.bars.hidden) return;
    const point: CaretPoint = caretPoint(this.input, this.input.selectionEnd);
    this.bars.style.transform = `translate(${this.input.offsetLeft + point.left}px, ${this.input.offsetTop + point.top}px)`;
    this.bars.style.height = `${point.height}px`;
  }
}
