import type { AttachmentUpload } from '../../shared/types';
import { requireElement } from '../dom';
import { isTouchWeb } from '../host';
import type { Lightbox } from '../lightbox';
import type { ComposerDraft } from './draft-store';
import { AttachmentTray } from './attachment-tray';
import type { DictationState } from './dictation';
import type { DictationTarget } from './hands-free/dictation-target';
import type { SendingDraft } from './sending-draft';
import { sendingDraft } from './sending-draft';
import { AttachmentMarkers } from './attachment-markers';
import { wireAttachmentInput } from './attachment-input';
import { returnKeyAction, showNewLineReturnKey } from './return-key';
import { keepingThreadEnd } from './thread-end';
import { DictationDisplay } from './voice/dictation-display';
import type { DictationPlace } from './voice/dictation-place';
import type { FieldVoice } from './voice/field-voice';
import type { KeptDrafts } from './voice/kept-draft';
import { keptDraftOf } from './voice/kept-draft';
import { carryPause } from './voice/pause-send';
import { sharedVoiceHub } from './voice/shared-voice-hub';
import type { VoiceField } from './voice/voice-field';
import type { VoiceHub } from './voice/voice-hub';

export type MessageSubmitted = (text: string, attachments: readonly AttachmentUpload[]) => Promise<boolean>;
export type ComposerProblem = (message: string) => void;

// A leading /name (letters, digits, - : . _) followed by a space; a path such as /home/x is not a command.
const LEADING_COMMAND: RegExp = /^\s*(\/[\w:.-]+(?:\s|$))?/;

// Enter sends, Shift+Enter adds a line (on a touch screen return only adds lines), holding Space (or the mic)
// dictates, a double tap of Space keeps the mic on hands-free; the draft is kept if sending fails.
const LEFT_KEY: string = 'ArrowLeft';

export class Composer {
  private readonly form: HTMLFormElement = requireElement('#composer');
  private readonly input: HTMLTextAreaElement = requireElement('#composer-input');
  private readonly button: HTMLButtonElement = requireElement('#composer-send');
  private readonly mic: HTMLButtonElement = requireElement('#composer-mic');
  private readonly markers: AttachmentMarkers = new AttachmentMarkers(this.input);
  private readonly tray: AttachmentTray;
  private readonly hub: VoiceHub = sharedVoiceHub();
  private readonly display: DictationDisplay;
  private readonly field: VoiceField;
  private readonly voice: FieldVoice;

  constructor(
    private readonly onSubmit: MessageSubmitted,
    onProblem: ComposerProblem,
    lightbox: Lightbox,
    private readonly drafts: KeptDrafts,
  ) {
    this.tray = new AttachmentTray(requireElement('#attachment-tray'), lightbox, this.markers);
    this.markers.connect(this.tray);
    wireAttachmentInput(
      { host: this.form, input: this.input, layer: requireElement('#composer-markers'), attach: requireElement('#composer-attach'), picker: requireElement('#composer-file') },
      this.markers,
      this.tray,
      onProblem,
    );
    this.form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      void this.submit();
    });
    if (isTouchWeb()) showNewLineReturnKey(this.input);
    this.input.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (returnKeyAction(event, isTouchWeb()) !== 'send') return;
      event.preventDefault();
      void this.submit();
    });
    this.display = new DictationDisplay(
      { host: this.form, box: requireElement('#composer-box'), input: this.input, bars: requireElement('#voice-bars') },
      (): number => this.hub.level(),
    );
    this.field = {
      input: this.input,
      mic: this.mic,
      showState: (state: DictationState): void => this.display.show(state),
      draftChanged: (): void => this.display.placeBars(),
      showError: onProblem,
      mayRefocus: (): boolean => true,
    };
    this.voice = this.hub.attach(this.field);
    this.reserveSpaceInThread();
  }

  focus(): void {
    this.input.focus();
  }

  // Dictation from outside the field: the caret goes to the end of the draft, where the words will land.
  startDictation(): void {
    if (document.activeElement !== this.input) {
      this.input.focus();
      this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    }
    this.hub.pressOutside(this.voice);
  }

  // Hands-free words follow the chat on screen; null pauses them.
  followDictationTarget(target: DictationTarget | null): void {
    this.hub.followDrawer(target === null ? null : this.placeOf(target));
  }

  // Words still being refined for a chat that was left finish in its kept draft; a starting chat keeps none.
  private placeOf(target: DictationTarget): DictationPlace {
    return { target, field: this.field, kept: target.kind === 'chat' ? keptDraftOf(this.drafts, target.sessionId) : null };
  }

  // The unsent text and images, to keep while another chat is open.
  draft(): ComposerDraft {
    return { text: this.input.value, files: this.tray.files() };
  }

  // A voice send still counting its pause goes on after the draft is put away: `act` runs when the pause ends.
  carryPausedSend(act: () => void): void {
    carryPause(this.input, act);
  }

  // Puts a kept draft back; its markers already sit where its images belong.
  restoreDraft(draft: ComposerDraft): void {
    this.reset();
    this.input.value = draft.text;
    this.tray.add(draft.files);
  }

  // A slash command only works at the start of a message, so it goes in front of the draft (replacing one
  // already there), with the caret after it, ready for its arguments.
  insertCommand(command: string): void {
    const rest: string = this.input.value.replace(LEADING_COMMAND, '');
    this.input.value = `${command}${rest}`;
    this.input.focus();
    this.input.setSelectionRange(command.length, command.length);
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // The images go with the draft, since their markers in it say where each one belongs.
  reset(): void {
    this.hub.cancel(this.voice);
    this.input.value = '';
    this.tray.clear();
  }

  // The composer floats over the thread and grows with its text; the thread keeps that much room at its end.
  // Its border box is watched: on a phone the bottom padding follows the safe area and the keyboard while the
  // content stays put, and a stale height would leave the working line over the field.
  private reserveSpaceInThread(): void {
    const sheet: HTMLElement = requireElement('#sheet');
    const thread: HTMLElement = requireElement('#sheet-messages');
    new ResizeObserver((): void => {
      keepingThreadEnd(thread, (): void => sheet.style.setProperty('--composer-space', `${this.form.offsetHeight}px`));
    }).observe(this.form, { box: 'border-box' });
  }

  // Left arrow in an empty composer has nowhere to go, so it backs out of the chat, like going back a page.
  closeOnLeftWhenEmpty(close: () => void): void {
    this.input.addEventListener('keydown', (event: KeyboardEvent): void => {
      const plain: boolean = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (event.key !== LEFT_KEY || !plain || this.input.value.length > 0 || this.tray.count > 0) return;
      event.preventDefault();
      close();
    });
  }

  private async submit(): Promise<void> {
    const hasText: boolean = this.input.value.trim().length > 0;
    if ((!hasText && this.tray.count === 0) || this.button.disabled) return;
    this.hub.messageSent(this.voice);
    const draft: SendingDraft = await sendingDraft(this.input.value, this.tray);
    // Optimistic: the field and the images clear right away and come back only if delivery fails.
    this.reset();
    this.button.disabled = true;
    const sent: boolean = await this.onSubmit(draft.text, draft.uploads);
    this.button.disabled = false;
    if (!sent) this.restore(draft.text, draft.files);
  }

  // Whatever the user started meanwhile is kept; images put back without their draft get markers at its end.
  private restore(text: string, files: readonly File[]): void {
    const restoresText: boolean = this.input.value.length === 0;
    if (restoresText) this.input.value = text;
    if (this.tray.count > 0) return;
    const added: number = this.tray.add(files);
    if (!restoresText) this.markers.appendMarkers(added);
  }
}
