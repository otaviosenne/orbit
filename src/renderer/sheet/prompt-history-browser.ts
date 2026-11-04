import type { RadarApi } from '../../shared/types';
import { element } from '../dom';

export type PromptHistoryApi = Pick<RadarApi, 'getPromptHistory'>;

const BROWSING_CLASS: string = 'is-browsing-history';
const NEWER: 1 = 1;
const OLDER: -1 = -1;

// Up and Down in the composer walk the prompts typed in the chat's folder, as in the chat window: Up from the first line
// shows the one before, Down from the last line the one after, and past the newest the draft comes back. While a
// prompt from the history shows, the box is outlined yellow with "n of m"; typing in it makes it a draft like any other.
export class PromptHistoryBrowser {
  private readonly counter: HTMLSpanElement = element('span', 'composer-history-count');
  private prompts: readonly string[] = [];
  // Which prompt shows; null while the field holds the user's own draft.
  private index: number | null = null;
  private draft: string = '';
  private isApplying: boolean = false;
  private isLoading: boolean = false;

  constructor(
    private readonly input: HTMLTextAreaElement,
    private readonly box: HTMLElement,
    private readonly sessionId: () => string | null,
    private readonly api: PromptHistoryApi,
  ) {
    this.counter.hidden = true;
    this.counter.setAttribute('aria-live', 'polite');
    box.append(this.counter);
    input.addEventListener('keydown', (event: KeyboardEvent): void => this.onKey(event));
    input.addEventListener('input', (): void => {
      if (!this.isApplying) this.stop();
    });
  }

  // The prompt shown becomes plain text in the field; another chat or a sent message ends the walk.
  stop(): void {
    this.index = null;
    this.box.classList.remove(BROWSING_CLASS);
    this.counter.hidden = true;
  }

  private onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    if (event.key === 'ArrowUp' && this.caretOnFirstLine()) {
      event.preventDefault();
      void this.step(OLDER);
    } else if (event.key === 'ArrowDown' && this.index !== null && this.caretOnLastLine()) {
      event.preventDefault();
      void this.step(NEWER);
    }
  }

  private async step(direction: typeof NEWER | typeof OLDER): Promise<void> {
    if (this.index === null) {
      if (direction === NEWER || this.isLoading) return;
      if (!(await this.load())) return;
      this.draft = this.input.value;
      this.show(this.prompts.length - 1, direction);
      return;
    }
    const next: number = this.index + direction;
    if (next < 0) return;
    if (next >= this.prompts.length) {
      this.apply(this.draft, this.draft.length);
      return this.stop();
    }
    this.show(next, direction);
  }

  // Read fresh each walk, so a prompt sent a moment ago is the first one Up shows.
  private async load(): Promise<boolean> {
    const sessionId: string | null = this.sessionId();
    if (sessionId === null) return false;
    this.isLoading = true;
    this.prompts = await this.api.getPromptHistory(sessionId).catch((): string[] => []);
    this.isLoading = false;
    return this.prompts.length > 0 && sessionId === this.sessionId();
  }

  // Going back the caret lands at the start, going forward at the end, so the next press keeps walking.
  private show(index: number, direction: typeof NEWER | typeof OLDER): void {
    this.index = index;
    const prompt: string = this.prompts[index] ?? '';
    this.apply(prompt, direction === OLDER ? 0 : prompt.length);
    this.box.classList.add(BROWSING_CLASS);
    this.counter.textContent = `${index + 1} of ${this.prompts.length}`;
    this.counter.hidden = false;
  }

  private apply(text: string, caret: number): void {
    this.isApplying = true;
    this.input.value = text;
    this.input.setSelectionRange(caret, caret);
    // The field grows with its text and its markers follow it; both listen for input.
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.isApplying = false;
  }

  private caretOnFirstLine(): boolean {
    return !this.input.value.slice(0, this.input.selectionStart).includes('\n');
  }

  private caretOnLastLine(): boolean {
    return !this.input.value.slice(this.input.selectionEnd).includes('\n');
  }
}
