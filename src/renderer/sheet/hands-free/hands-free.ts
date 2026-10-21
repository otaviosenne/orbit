import type { TranscriptionResult } from '../../../shared/types';
import { PcmRecorder } from '../pcm-recorder';
import { DictatedSpan } from './dictated-span';
import type { DictationPlace } from '../voice/dictation-place';
import type { VoiceField } from '../voice/voice-field';
import type { RetargetPlan } from './dictation-target';
import { planRetarget, startsAtDraftEnd } from './dictation-target';
import { pcmLevel } from './pcm-level';
import { SegmentClock } from './segment-clock';
import type { LaneSegment } from './segment-lane';
import { SegmentLane } from './segment-lane';
import { SilentMicAlarm } from './silent-mic-alarm';
import { MUTED_MIC_MESSAGE } from '../voice/speech-presence';
import type { SpanBinding } from './span-writer';
import { DROPPED_SINK, SpanWriter } from './span-writer';

// off; live (listening into the target composer); paused (on, but there is no target composer);
// finishing (turned off, the last words are still being refined).
export type HandsFreeState = 'off' | 'live' | 'paused' | 'finishing';

export interface HandsFreeHooks {
  readonly onState: (state: HandsFreeState) => void;
  // The target composer changed (or went away), even while the state stayed the same.
  readonly onMoved: () => void;
  readonly onError: (message: string) => void;
}

// "Mic always on": the microphone stays live without holding Space, and words go into the target composer: the
// side panel's chat, or the focused Panel tile. The audio is cut into segments (one voice session each) at pauses, at a
// maximum length and whenever the words change destination, so every utterance is finalized on the way.
export class HandsFree {
  private readonly recorder: PcmRecorder = new PcmRecorder();
  private readonly lane: SegmentLane;
  private readonly writer: SpanWriter = new SpanWriter();
  private readonly spans: Map<number, SpanBinding> = new Map();
  private attached: SpanBinding | null = null;
  private clock: SegmentClock | null = null;
  // Per time hands-free is turned on, not per capture: switching chats reopens the microphone and must not warn again.
  private alarm: SilentMicAlarm | null = null;
  private place: DictationPlace | null = null;
  private requestedPlace: DictationPlace | null = null;
  private isRetargetQueued: boolean = false;
  private isEnabled: boolean = false;
  private isCapturing: boolean = false;
  private isStopping: boolean = false;
  // Starting and stopping the microphone take time; they run one after another, never interleaved.
  private capture: Promise<void> = Promise.resolve();
  private reported: HandsFreeState = 'off';

  constructor(private readonly hooks: HandsFreeHooks) {
    this.lane = new SegmentLane(window.radar, {
      onText: (segment: LaneSegment, text: string): void => this.showWords(segment, text),
      onFinal: (segment: LaneSegment, result: TranscriptionResult): void => this.settle(segment, result),
      onFailure: (message: string): void => this.fail(`Voice dictation unavailable: ${message}`),
    });
  }

  get isOn(): boolean {
    return this.isEnabled;
  }

  // On, or still refining what was said before it was turned off: push-to-talk must wait for the microphone.
  get isBusy(): boolean {
    return this.isEnabled || this.isStopping;
  }

  // The field of the target composer, which shows the hands-free state.
  get field(): VoiceField | null {
    return this.place?.field ?? null;
  }

  level(): number {
    return this.recorder.level();
  }

  // ready: what has to end first, such as the push-to-talk dictation the double tap interrupted.
  turnOn(ready: Promise<void>): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.alarm = new SilentMicAlarm();
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

  // The panel moves its target in several steps while opening a chat, and focus passes through no tile on its way
  // from one tile to another; only where it ends up counts.
  follow(place: DictationPlace | null): void {
    this.requestedPlace = place;
    if (this.isRetargetQueued) return;
    this.isRetargetQueued = true;
    queueMicrotask((): void => {
      this.isRetargetQueued = false;
      this.retarget(this.requestedPlace);
    });
  }

  // The draft in field was sent: words said so far never come back, and what follows starts the next message.
  discard(field: VoiceField): void {
    if (this.attached === null || !writesInto(this.attached, field)) return;
    this.attached.sink = DROPPED_SINK;
    this.attached = null;
    if (!this.isCapturing) return;
    this.attached = this.fieldBinding();
    this.cut();
  }

  // The user typed or deleted in field: their edit wins. What the words showed so far is now theirs, so deleted
  // words never come back; words the voice service has not shown yet still arrive, at the caret.
  edited(field: VoiceField): void {
    const attached: SpanBinding | null = this.attached;
    if (attached !== null && writesInto(attached, field)) attached.span.rebase();
  }

  private retarget(next: DictationPlace | null): void {
    const previous: DictationPlace | null = this.place;
    const plan: RetargetPlan = planRetarget(previous?.target ?? null, next?.target ?? null);
    this.place = next;
    if (previous !== next) this.hooks.onMoved();
    if (plan === 'none' || plan === 'carry') return;
    this.leave(previous);
    if (next !== null && startsAtDraftEnd(plan, this.isEnabled)) caretToEnd(next.field.input);
    if (plan === 'switch' && this.isCapturing) {
      this.attached = this.fieldBinding();
      this.cut();
    }
    this.syncCapture();
    this.report();
  }

  // What was said for the composer being left finishes in its kept draft.
  private leave(previous: DictationPlace | null): void {
    if (this.attached === null) return;
    const kept: DictationPlace['kept'] = previous?.kept ?? null;
    this.attached.sink = kept === null ? DROPPED_SINK : { kind: 'kept', draft: kept };
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
    const wanted: boolean = this.isEnabled && this.place !== null;
    if (wanted && !this.isCapturing) await this.startCapture();
    else if (!wanted && this.isCapturing) await this.stopCapture();
  }

  private async startCapture(): Promise<void> {
    this.isCapturing = true;
    this.attached = this.fieldBinding();
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
    const level: number = pcmLevel(pcm);
    const now: number = Date.now();
    // A hint, not a failure: the microphone stays on in case it is unmuted.
    if (this.alarm?.heard(level, now) === true) this.hooks.onError(MUTED_MIC_MESSAGE);
    const clock: SegmentClock | null = this.clock;
    if (clock === null) return;
    clock.heard(level, now);
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

  // New words go into the target composer's field as it is now; a later move does not take this span along.
  private fieldBinding(): SpanBinding | null {
    const place: DictationPlace | null = this.place;
    return place === null ? null : { span: new DictatedSpan(), sink: { kind: 'field', field: place.field } };
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
    if (this.isEnabled) return this.place === null ? 'paused' : 'live';
    return this.isStopping ? 'finishing' : 'off';
  }
}

function caretToEnd(input: HTMLTextAreaElement): void {
  input.setSelectionRange(input.value.length, input.value.length);
}

function writesInto(binding: SpanBinding, field: VoiceField): boolean {
  return binding.sink.kind === 'field' && binding.sink.field === field;
}
