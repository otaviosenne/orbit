import type { PlacedText } from '../dictation-placement';
import { DOUBLE_TAP_MS } from './double-tap';

const SPACE_KEY: string = ' ';
const SUBMIT_KEY: string = 'Enter';

// Types the space a tapped Space stands for, and takes it back when that tap turns out to open a double tap.
export class SpaceTyping {
  private typed: PlacedText | null = null;
  private deferred: number | undefined;

  constructor(private readonly input: HTMLTextAreaElement) {
    // A waiting space goes in before the next key's character, so typed text keeps its order; Enter sends
    // the message without it.
    input.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === SUBMIT_KEY) this.cancelDeferred();
      else if (event.key !== SPACE_KEY) this.flush();
    }, true);
  }

  type(): void {
    this.input.setRangeText(SPACE_KEY, this.input.selectionStart, this.input.selectionEnd, 'end');
    this.typed = { value: this.input.value, caret: this.input.selectionStart };
  }

  // While hands-free words flow, typing counts as taking over and drops words still being refined; a space
  // typed only to be taken back by the second tap of a double tap must not do that, so it waits that long.
  defer(): void {
    this.cancelDeferred();
    this.deferred = window.setTimeout((): void => this.flush(), DOUBLE_TAP_MS);
  }

  takeBack(): void {
    this.cancelDeferred();
    const typed: PlacedText | null = this.typed;
    this.typed = null;
    if (typed === null || !this.isUntouchedSince(typed)) return;
    this.input.setRangeText('', typed.caret - SPACE_KEY.length, typed.caret, 'end');
  }

  private isUntouchedSince(typed: PlacedText): boolean {
    return this.input.value === typed.value && this.input.selectionStart === typed.caret && this.input.selectionEnd === typed.caret;
  }

  private flush(): void {
    if (this.deferred === undefined) return;
    this.cancelDeferred();
    this.type();
    // setRangeText fires no input event; the draft store and hands-free dictation listen for one.
    this.input.dispatchEvent(new Event('input'));
  }

  private cancelDeferred(): void {
    window.clearTimeout(this.deferred);
    this.deferred = undefined;
  }
}
