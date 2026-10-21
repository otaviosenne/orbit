import type { DictationStart, DictationTranscript, TranscriptionResult } from '../../shared/types';
import type { DraftAnchor, PlacedText } from './dictation-placement';
import { placeDictation } from './dictation-placement';
import { PcmRecorder } from './pcm-recorder';

export type DictationState = 'idle' | 'listening' | 'refining';

export interface DictationHandlers {
  readonly onState: (state: DictationState) => void;
  readonly onError: (message: string) => void;
  // The draft text changed under the caret (live words or the final text).
  readonly onDraft: () => void;
}

// One push-to-talk dictation: words stream in while you talk and the final text lands on release, like Claude Code.
export class Dictation {
  private readonly recorder: PcmRecorder = new PcmRecorder();
  private opening: Promise<boolean> | null = null;
  private session: number | null = null;
  private anchor: DraftAnchor | null = null;
  private isListening: boolean = false;

  constructor(private readonly input: HTMLTextAreaElement, private readonly handlers: DictationHandlers) {
    input.addEventListener('focus', (): void => window.radar.prepareDictation());
    input.addEventListener('input', (): void => this.abandonRefinement());
    window.radar.onDictationTranscript((transcript: DictationTranscript): void => this.showLive(transcript));
  }

  // Called when the draft is sent or cleared: the microphone turns off and nothing from this
  // dictation (live words or the final text) may write into the composer again.
  // Resolves once the microphone and the session are released, so another dictation can take them.
  cancel(): Promise<void> {
    const opening: Promise<boolean> | null = this.opening;
    const wasActive: boolean = this.isListening || opening !== null || this.anchor !== null;
    this.isListening = false;
    this.anchor = null;
    this.opening = null;
    if (wasActive) this.handlers.onState('idle');
    return opening === null ? Promise.resolve() : opening.then((): Promise<void> => this.shutDown());
  }

  // Typing over a draft means the user took over; a late final text must not overwrite their edit.
  private abandonRefinement(): void {
    if (this.isListening || this.anchor === null) return;
    this.anchor = null;
    this.handlers.onState('idle');
  }

  private async shutDown(): Promise<void> {
    await this.recorder.stop();
    if (this.session !== null) window.radar.cancelDictation(this.session);
  }

  get listening(): boolean {
    return this.isListening;
  }

  start(): void {
    this.begin();
  }

  // Space released after a hold, or tapped while listening: the final text lands.
  release(): void {
    void this.finish();
  }

  // For the mic button: starts dictation, or finishes the one in progress.
  toggle(): void {
    if (this.isListening) void this.finish();
    else this.begin();
  }

  level(): number {
    return this.recorder.level();
  }

  private begin(): void {
    if (this.isListening || this.opening !== null) return;
    this.isListening = true;
    this.anchor = { before: this.input.value.slice(0, this.input.selectionStart), after: this.input.value.slice(this.input.selectionEnd) };
    this.handlers.onState('listening');
    this.opening = this.open();
  }

  // Resolves false when dictation could not start; the reason has already been reported.
  // The microphone and the session start together; audio captured before the session exists is held back.
  private async open(): Promise<boolean> {
    const early: Uint8Array[] = [];
    let session: number | null = null;
    const capture: Promise<void> = this.recorder.start((pcm: Uint8Array): void => {
      if (session === null) early.push(pcm);
      else window.radar.feedDictation(session, pcm);
    });
    const start: DictationStart = await window.radar.startDictation();
    this.session = start.session;
    if (start.error !== null) return this.abort(`Voice dictation unavailable: ${start.error}`);
    for (const pcm of early.splice(0)) window.radar.feedDictation(start.session, pcm);
    session = start.session;
    try {
      await capture;
      return true;
    } catch (error: unknown) {
      return this.abort(`Microphone unavailable: ${String(error)}`);
    }
  }

  private abort(reason: string): boolean {
    this.isListening = false;
    this.handlers.onError(reason);
    return false;
  }

  // Live words only count for the dictation that is still being held.
  private showLive(transcript: DictationTranscript): void {
    if (this.isListening && transcript.session === this.session) this.showDraft(transcript.text);
  }

  private async finish(): Promise<void> {
    if (this.opening === null) return;
    const started: boolean = await this.opening;
    this.opening = null;
    this.isListening = false;
    await this.recorder.stop();
    if (!started) {
      this.anchor = null;
      this.handlers.onState('idle');
      return;
    }
    const anchor: DraftAnchor | null = this.anchor;
    this.handlers.onState('refining');
    this.input.focus();
    const result: TranscriptionResult = await window.radar.finishDictation(this.session ?? 0);
    if (this.anchor !== anchor) return;
    // An empty final result keeps whatever the live preview showed.
    if (result.ok && result.text.length > 0) this.showDraft(result.text);
    else if (!result.ok) this.handlers.onError(`Transcription failed: ${result.error ?? 'unknown error'}`);
    this.anchor = null;
    this.handlers.onState('idle');
  }

  private showDraft(text: string): void {
    if (this.anchor === null) return;
    const placed: PlacedText = placeDictation(this.anchor, text);
    this.input.value = placed.value;
    this.input.setSelectionRange(placed.caret, placed.caret);
    this.handlers.onDraft();
  }
}
