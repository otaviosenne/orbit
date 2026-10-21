import type { ActionResult } from '../../../shared/types';
import { element } from '../../dom';
import { CHAT_ICON } from '../../icons';
import type { DictationPlace } from '../../sheet/voice/dictation-place';
import type { FieldVoice } from '../../sheet/voice/field-voice';
import type { VoiceHub } from '../../sheet/voice/voice-hub';
import { setText } from './in-place';
import { FOCUS_SETTLE_MS } from './tile-focus';
import { TileVoiceField } from './tile-voice-field';

export type TileSend = (text: string) => Promise<ActionResult>;

const SUBMIT_KEY: string = 'Enter';
const CLOSE_KEY: string = 'Escape';
const TEXT_ROWS: number = 1;
const OPEN_CLASS: string = 'is-open';
const SEND_LABEL: string = 'Send';
const WRITE_LABEL: string = 'Write to this chat';

// A plain text field at the foot of a tile: Enter sends, Shift+Enter adds a line. The draft clears at once and
// comes back if delivery fails. In short tiles (two or more rows) it folds into a round button where Send sits;
// pressing it opens the field to its left, and Escape folds it again, keeping the draft. The mic in the field,
// a held Space and the hands-free mode dictate into it like into the side panel's composer.
export class TileComposer {
  readonly root: HTMLFormElement = element('form', 'tile-composer');
  private readonly input: HTMLTextAreaElement = element('textarea', 'tile-composer-input');
  private readonly button: HTMLButtonElement = element('button', 'button button-primary tile-composer-send', 'Send');
  private readonly problem: HTMLElement = element('p', 'tile-composer-problem');
  private readonly field: TileVoiceField;
  private readonly voice: FieldVoice;
  private isReady: boolean = false;
  private isSending: boolean = false;
  private isExpanded: boolean = false;
  private isAlwaysOpen: boolean = true;

  constructor(private readonly onSend: TileSend, private readonly hub: VoiceHub) {
    this.input.rows = TEXT_ROWS;
    this.input.placeholder = 'Message';
    this.button.type = 'submit';
    // Pressing the button must not blur the field first: that would fold it on the way down and the click would
    // open it again, a visible flicker.
    this.button.addEventListener('mousedown', (event: MouseEvent): void => event.preventDefault());
    this.button.addEventListener('click', (event: MouseEvent): void => {
      if (this.isOpen && !this.foldsOnPress()) return;
      event.preventDefault();
      if (this.isOpen) this.fold();
      else this.expand();
    });
    this.field = new TileVoiceField(this.input, this.root, hub, {
      draftChanged: (): void => this.showButtonState(),
      showError: (message: string): void => setText(this.problem, message),
    });
    const row: HTMLDivElement = element('div', 'tile-composer-row');
    row.append(this.field.box, this.button);
    this.root.append(this.problem, row);
    this.listen();
    this.voice = hub.attach(this.field);
    this.showOpenState();
  }

  get isOpen(): boolean {
    return this.isAlwaysOpen || this.isExpanded;
  }

  get hasFocus(): boolean {
    return this.field.hasFocus;
  }

  // Tall tiles (one row) have room for the field all the time; short ones fold it behind the button. A field in use
  // stays open through the change, so neither the caret nor dictated words end up hidden.
  setAlwaysOpen(isAlwaysOpen: boolean): void {
    if (this.isAlwaysOpen === isAlwaysOpen) return;
    this.isAlwaysOpen = isAlwaysOpen;
    if (!isAlwaysOpen && this.isInUse()) this.isExpanded = true;
    this.showOpenState();
  }

  // Hands-free words are about to come in here; a folded field opens for them.
  becomeTarget(): void {
    if (!this.isOpen) this.expand();
  }

  dictationPlace(sessionId: string): DictationPlace {
    return this.field.place(sessionId);
  }

  // The tile was taken out of the Panel.
  dispose(): void {
    this.hub.detach(this.voice);
  }

  private isInUse(): boolean {
    return this.hasFocus || this.field.isDictating;
  }

  private expand(): void {
    this.isExpanded = true;
    this.showOpenState();
    this.input.focus();
  }

  private fold(): void {
    this.isExpanded = false;
    this.showOpenState();
  }

  private showOpenState(): void {
    this.root.classList.toggle(OPEN_CLASS, this.isOpen);
    if (this.isOpen) {
      this.button.textContent = SEND_LABEL;
      this.button.removeAttribute('aria-label');
    } else {
      this.button.innerHTML = CHAT_ICON;
      this.button.setAttribute('aria-label', WRITE_LABEL);
    }
    this.button.title = this.isOpen ? '' : WRITE_LABEL;
    this.showButtonState();
  }

  // Sending waits for the chat's transcript: a message shown before it arrives would be wiped by it.
  setReady(isReady: boolean): void {
    this.isReady = isReady;
    this.showButtonState();
  }

  private listen(): void {
    this.root.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      void this.submit();
    });
    this.input.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY && !this.isAlwaysOpen) {
        event.stopPropagation();
        this.fold();
        return;
      }
      if (event.key !== SUBMIT_KEY || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      void this.submit();
    });
    // Leaving an empty field folds it back, so the button does not need a second press to put it away.
    this.input.addEventListener('blur', (): void => void window.setTimeout((): void => this.foldIfLeft(), FOCUS_SETTLE_MS));
    this.input.addEventListener('input', (): void => {
      setText(this.problem, '');
      this.showButtonState();
    });
  }

  // Switching to another window blurs the field but leaves it focused here: it stays open for words still coming.
  private foldIfLeft(): void {
    if (this.isInUse() || !this.foldsOnPress()) return;
    this.fold();
  }

  private async submit(): Promise<void> {
    const text: string = this.input.value;
    if (text.trim().length === 0 || !this.isReady || this.isSending) return;
    this.hub.messageSent(this.voice);
    this.input.value = '';
    setText(this.problem, '');
    this.isSending = true;
    this.showButtonState();
    const result: ActionResult = await this.onSend(text);
    this.isSending = false;
    if (!result.ok) this.restore(text, result);
    this.showButtonState();
  }

  private restore(text: string, result: ActionResult): void {
    if (this.input.value.length === 0) this.input.value = text;
    setText(this.problem, `Not sent: ${result.error ?? 'unknown error'}`);
  }

  // Folded, the button only opens the field, so it stays usable whatever the draft holds.
  // An open, empty field that may fold: Send puts it away instead of sending nothing.
  private foldsOnPress(): boolean {
    return !this.isAlwaysOpen && this.input.value.trim().length === 0;
  }

  private showButtonState(): void {
    const hasNothingToSend: boolean = this.input.value.trim().length === 0 && !this.foldsOnPress();
    this.button.disabled = this.isOpen && (!this.isReady || this.isSending || hasNothingToSend);
  }
}
