import type { AttachmentUpload } from '../../shared/types';
import { requireElement } from '../dom';
import { IMAGE_ICON } from '../icons';
import type { Lightbox } from '../lightbox';
import type { ComposerDraft } from './draft-store';
import { AttachmentTray } from './attachment-tray';
import type { DictationState } from './dictation';
import type { DictationTarget } from './hands-free/dictation-target';
import type { OrderedDraft } from './draft-image-tokens';
import { orderByTokens } from './draft-image-tokens';
import { ImageMarkers } from './image-markers';
import { AtomicMarkers } from './atomic-markers';
import { MarkerChipClicks } from './marker-chip-clicks';
import { MarkerHighlight } from './marker-highlight';
import { keepingThreadEnd } from './thread-end';
import { DictationDisplay } from './voice/dictation-display';
import type { DictationPlace } from './voice/dictation-place';
import type { FieldVoice } from './voice/field-voice';
import type { KeptDrafts } from './voice/kept-draft';
import { keptDraftOf } from './voice/kept-draft';
import { sharedVoiceHub } from './voice/shared-voice-hub';
import type { VoiceField } from './voice/voice-field';
import type { VoiceHub } from './voice/voice-hub';

export type MessageSubmitted = (text: string, attachments: readonly AttachmentUpload[]) => Promise<boolean>;
export type ComposerProblem = (message: string) => void;

const SUBMIT_KEY: string = 'Enter';
// A leading /name (letters, digits, - : . _) followed by a space; a path such as /home/x is not a command.
const LEADING_COMMAND: RegExp = /^\s*(\/[\w:.-]+(?:\s|$))?/;

// Enter sends, Shift+Enter adds a line, holding Space (or the mic) dictates, a double tap of Space keeps the mic
// on hands-free; the draft is kept if sending fails.
export class Composer {
  private readonly form: HTMLFormElement = requireElement('#composer');
  private readonly input: HTMLTextAreaElement = requireElement('#composer-input');
  private readonly button: HTMLButtonElement = requireElement('#composer-send');
  private readonly mic: HTMLButtonElement = requireElement('#composer-mic');
  private readonly markers: ImageMarkers = new ImageMarkers(this.input);
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
    this.setUpAttachments();
    this.setUpMarkerChips();
    this.form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      void this.submit();
    });
    this.input.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== SUBMIT_KEY || event.shiftKey) return;
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
  private reserveSpaceInThread(): void {
    const sheet: HTMLElement = requireElement('#sheet');
    const thread: HTMLElement = requireElement('#sheet-messages');
    new ResizeObserver((): void => {
      keepingThreadEnd(thread, (): void => sheet.style.setProperty('--composer-space', `${this.form.offsetHeight}px`));
    }).observe(this.form);
  }

  // Images come in by pasting, dropping files on the composer, or the image button.
  private setUpAttachments(): void {
    const picker: HTMLInputElement = requireElement('#composer-file');
    const attach: HTMLButtonElement = requireElement('#composer-attach');
    attach.innerHTML = IMAGE_ICON;
    attach.addEventListener('mousedown', (event: MouseEvent): void => event.preventDefault());
    attach.addEventListener('click', (): void => picker.click());
    picker.addEventListener('change', (): void => {
      this.markers.attach(picker.files ?? []);
      picker.value = '';
      this.input.focus();
    });
    this.input.addEventListener('paste', (event: ClipboardEvent): void => {
      const files: File[] = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      this.markers.attach(files);
    });
    this.form.addEventListener('dragover', (event: DragEvent): void => event.preventDefault());
    this.form.addEventListener('drop', (event: DragEvent): void => {
      const files: File[] = [...(event.dataTransfer?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      this.markers.attach(files);
    });
  }

  // Each marker shows as a chip that the caret steps over and that opens its image when clicked.
  private setUpMarkerChips(): void {
    const highlight: MarkerHighlight = new MarkerHighlight(this.input, requireElement('#composer-markers'));
    new AtomicMarkers(this.input);
    new MarkerChipClicks(this.input, highlight, (number: number): void => this.tray.preview(number - 1));
  }

  private async submit(): Promise<void> {
    const hasText: boolean = this.input.value.trim().length > 0;
    if ((!hasText && this.tray.count === 0) || this.button.disabled) return;
    this.hub.messageSent(this.voice);
    const draft: OrderedDraft = orderByTokens(this.input.value, this.tray.count);
    const uploads: AttachmentUpload[] = inOrder(await this.tray.uploads(), draft.order);
    const files: File[] = inOrder(this.tray.files(), draft.order);
    // Optimistic: the field and the images clear right away and come back only if delivery fails.
    this.reset();
    this.button.disabled = true;
    const sent: boolean = await this.onSubmit(draft.text, uploads);
    this.button.disabled = false;
    if (!sent) this.restore(draft.text, files);
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

function inOrder<T>(items: readonly T[], order: readonly number[]): T[] {
  return order.flatMap((index: number): T[] => {
    const item: T | undefined = items[index];
    return item === undefined ? [] : [item];
  });
}
