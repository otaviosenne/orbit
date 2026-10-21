import type { TranscriptionResult } from '../../../shared/types';
import { PcmRecorder } from '../pcm-recorder';
import { DictatedSpan } from './dictated-span';
import type { DictationTarget, RetargetPlan } from './dictation-target';
import { planRetarget } from './dictation-target';
import { pcmLevel } from './pcm-level';
import { SegmentClock } from './segment-clock';
import type { LaneSegment } from './segment-lane';
import { SegmentLane } from './segment-lane';
import type { KeptDrafts, SpanBinding } from './span-writer';
import { COMPOSER_SINK, DROPPED_SINK, SpanWriter } from './span-writer';

// off; live (listening into the composer on screen); paused (on, but no composer on screen);
// finishing (turned off, the last words are still being refined).
export type HandsFreeState = 'off' | 'live' | 'paused' | 'finishing';

export interface HandsFreeHooks {
  readonly onState: (state: HandsFreeState) => void;
  readonly onDraft: () => void;
  readonly onError: (message: string) => void;
  readonly drafts: KeptDrafts;
}

// "Mic always on": the microphone stays live without holding Space, and words go into the composer of
// whichever chat is on screen. The audio is cut into segments (one voice session each) at pauses, at a
// maximum length and whenever the words change destination, so every utterance is finalized on the way.
export class HandsFree {
  private readonly recorder: PcmRecorder = new PcmRecorder();
  private readonly lane: SegmentLane;
  private readonly writer: SpanWriter;
  private readonly spans: Map<number, SpanBinding> = new Map();
  private attached: SpanBinding | null = null;
  private clock: SegmentClock | null = null;
  private target: DictationTarget | null = null;
  private requestedTarget: DictationTarget | null = null;
  private isRetargetQueued: boolean = false;
  private isEnabled: boolean = false;
  private isCapturing: boolean = false;
  private isStopping: boolean = false;
  // Starting and stopping the microphone take time; they run one after another, never interleaved.
  private capture: Promise<void> = Promise.resolve();
  private reported: HandsFreeState = 'off';

  constructor(input: HTMLTextAreaElement, private readonly hooks: HandsFreeHooks) {
    this.writer = new SpanWriter(input, hooks.drafts, hooks.onDraft);
    this.lane = new SegmentLane(window.radar, {
      onText: (segment: LaneSegment, text: string): void => this.showWords(segment, text),
      onFinal: (segment: LaneSegment, result: TranscriptionResult): void => this.settle(segment, result),
      onFailure: (message: string): void => this.fail(`Voice dictation unavailable: ${message}`),
    });
    input.addEventListener('input', (): void => this.takeOver());
  }

  get isOn(): boolean {
    return this.isEnabled;
  }

  // On, or still refining what was said before it was turned off: push-to-talk must wait for the microphone.
  get isBusy(): boolean {
    return this.isEnabled || this.isStopping;
  }

  level(): number {
    return this.recorder.level();
  }

  // ready: what has to end first, such as the push-to-talk dictation the double tap interrupted.
  turnOn(ready: Promise<void>): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.report();
    this.capture = this.capture.then((): Promise<void> => ready);
    this.syncCapture();
  }

  // Finalizes the words in progress like the end of a normal dictation.
  turnOff(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.syncCapture();
    this.report();
  }

  // The panel moves its target in several steps while opening a chat; only where it ends up counts.
  follow(target: DictationTarget | null): void {
    this.requestedTarget = target;
    if (this.isRetargetQueued) return;
    this.isRetargetQueued = true;
    queueMicrotask((): void => {
      this.isRetargetQueued = false;
      this.retarget(this.requestedTarget);
    });
  }

  // The draft was sent: words said so far never come back, and what follows starts the next message.
  discard(): void {
    if (this.attached === null) return;
    this.attached.sink = DROPPED_SINK;
    this.attached = null;
    if (!this.isCapturing) return;
    this.attached = composerBinding();
    this.cut();
  }

  // The user typed: their edit stays, late words of the old span are dropped, new words go at the caret.
  private takeOver(): void {
    const left: SpanBinding | null = this.attached;
    if (left === null) return;
    left.sink = DROPPED_SINK;
    this.attached = null;
    if (!this.isCapturing) return;
    this.attached = composerBinding();
    const segment: LaneSegment | null = this.lane.active;
    // A segment with no words yet simply moves on; typing away while silent does not open a stream per key.
    if (segment !== null && left.span.textOf(segment.id).length === 0) this.spans.set(segment.id, this.attached);
    else this.cut();
  }

  private retarget(next: DictationTarget | null): void {
    const previous: DictationTarget | null = this.target;
    const plan: RetargetPlan = planRetarget(previous, next);
    this.target = next;
    if (plan === 'none' || plan === 'carry') return;
    this.leave(previous);
    if (plan === 'switch' && this.isCapturing) {
      this.attached = composerBinding();
      this.cut();
    }
    this.syncCapture();
    this.report();
  }

  // What was said for the chat being left finishes in its kept draft.
  private leave(previous: DictationTarget | null): void {
    if (this.attached === null) return;
    this.attached.sink = previous?.kind === 'chat' ? { kind: 'draft', sessionId: previous.sessionId } : DROPPED_SINK;
    this.attached = null;
  }

  // Ends the current segment and starts the next, which writes into the attached span.
  private cut(): void {
    if (this.attached === null) return;
    const segment: LaneSegment = this.lane.next();
    this.spans.set(segment.id, this.attached);
    this.clock = new SegmentClock(Date.now());
  }

  private syncCapture(): void {
    this.capture = this.capture
      .then((): Promise<void> => this.applyCapture())
      .catch((error: unknown): void => this.fail(`Microphone unavailable: ${String(error)}`));
  }

  private async applyCapture(): Promise<void> {
    const wanted: boolean = this.isEnabled && this.target !== null;
    if (wanted && !this.isCapturing) await this.startCapture();
    else if (!wanted && this.isCapturing) await this.stopCapture();
  }

  private async startCapture(): Promise<void> {
    this.isCapturing = true;
    this.attached = composerBinding();
    this.cut();
    await this.recorder.start((pcm: Uint8Array): void => this.hear(pcm));
  }

  // Released while paused too: an open microphone with nowhere for the words to go is only a privacy risk.
  private async stopCapture(): Promise<void> {
    this.isCapturing = false;
    this.isStopping = true;
    this.clock = null;
    this.report();
    await this.recorder.stop();
    const ended: Promise<void> = this.lane.end();
    // Turning off shows "refining" until the last words land; a pause must not hold up reopening the mic.
    if (!this.isEnabled) await ended;
    this.isStopping = false;
    if (!this.isCapturing) this.attached = null;
    this.report();
  }

  private hear(pcm: Uint8Array): void {
    this.lane.feed(pcm);
    const clock: SegmentClock | null = this.clock;
    if (clock === null) return;
    const now: number = Date.now();
    clock.heard(pcmLevel(pcm), now);
    if (clock.due(now) !== null) this.cut();
  }

  private showWords(segment: LaneSegment, text: string): void {
    const binding: SpanBinding | undefined = this.spans.get(segment.id);
    if (binding === undefined) return;
    if (segment === this.lane.active && binding.span.textOf(segment.id) !== text) this.clock?.wrote(Date.now());
    this.writer.write(binding, segment.id, text);
  }

  private settle(segment: LaneSegment, result: TranscriptionResult): void {
    const binding: SpanBinding | undefined = this.spans.get(segment.id);
    this.spans.delete(segment.id);
    if (!result.ok) return this.hooks.onError(`Transcription failed: ${result.error ?? 'unknown error'}`);
    // An empty final keeps whatever the live words showed.
    if (binding !== undefined && result.text.length > 0) this.writer.write(binding, segment.id, result.text);
  }

  private fail(message: string): void {
    this.hooks.onError(message);
    this.turnOff();
  }

  private report(): void {
    const state: HandsFreeState = this.currentState();
    if (state === this.reported) return;
    this.reported = state;
    this.hooks.onState(state);
  }

  private currentState(): HandsFreeState {
    if (this.isEnabled) return this.target === null ? 'paused' : 'live';
    return this.isStopping ? 'finishing' : 'off';
  }
}

function composerBinding(): SpanBinding {
  return { span: new DictatedSpan(), sink: COMPOSER_SINK };
}
