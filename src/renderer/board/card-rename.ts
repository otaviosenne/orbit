import { element } from '../dom';

export type RenameSubmitted = (sessionId: string, name: string) => void;

// Matches the panel's rename field.
const MAX_NAME_LENGTH: number = 80;
const SUBMIT_KEY: string = 'Enter';
const CANCEL_KEY: string = 'Escape';

// Turns a card's title into a text field in place: Enter or leaving the field renames, Escape cancels.
// The board is rebuilt every poll, so while this is active the app holds off re-rendering it.
export class CardRename {
  private sessionId: string | null = null;
  private input: HTMLInputElement | null = null;

  constructor(private readonly onSubmit: RenameSubmitted, private readonly onEnd: () => void) {}

  // A field that left the page (another view took over) never blurs, so it must not keep the board on hold.
  get isActive(): boolean {
    return this.sessionId !== null && this.input?.isConnected === true;
  }

  start(card: HTMLElement, sessionId: string, currentName: string): void {
    const title: HTMLElement | null = card.querySelector<HTMLElement>('.card-name');
    if (title === null) return;
    this.sessionId = sessionId;
    const input: HTMLInputElement = element('input', 'card-name-input');
    this.input = input;
    input.value = currentName;
    input.maxLength = MAX_NAME_LENGTH;
    input.spellcheck = false;
    input.addEventListener('keydown', (event: KeyboardEvent): void => this.handleKey(event, input, currentName));
    input.addEventListener('blur', (): void => this.finish(input.value, currentName));
    title.replaceWith(input);
    input.focus();
    input.select();
  }

  private handleKey(event: KeyboardEvent, input: HTMLInputElement, currentName: string): void {
    // The app closes the panel on Escape; here it only cancels the rename.
    event.stopPropagation();
    if (event.key === SUBMIT_KEY) input.blur();
    if (event.key === CANCEL_KEY) {
      input.value = currentName;
      input.blur();
    }
  }

  private finish(value: string, currentName: string): void {
    const sessionId: string | null = this.sessionId;
    if (sessionId === null) return;
    this.sessionId = null;
    this.input = null;
    const name: string = value.trim();
    if (name.length > 0 && name !== currentName) this.onSubmit(sessionId, name);
    this.onEnd();
  }
}
