import { isWebHost } from '../../host';
import { rememberHandsFree, wasHandsFreeOn } from '../hands-free/hands-free-memory';
import { composerState } from '../hands-free/composer-state';
import { DoubleTap } from '../hands-free/double-tap';
import { HandsFree } from '../hands-free/hands-free';
import type { HandsFreeState } from '../hands-free/hands-free';
import { HandsFreeIndicator } from '../hands-free/hands-free-indicator';
import { isTextField } from '../space-to-talk';
import type { DictationPlace } from './dictation-place';
import { DictationRouter } from './dictation-router';
import { FieldVoice } from './field-voice';
import type { MicPress } from './mic-press';
import { micPress } from './mic-press';
import type { VoiceSurface } from './place-resolution';
import { TranscriptFeed } from './transcript-feed';
import type { VoiceField } from './voice-field';

const TALK_KEY: string = ' ';

// The voice service and the microphone are one for the whole window, so every composer (the side panel's and each
// Panel tile's) shares this: one dictation at a time, one hands-free mode with its top-bar indicator, one double tap.
// Hold Space to talk; tap it to start or stop; double tap it to keep the mic on until the next double tap.
export class VoiceHub {
  private readonly taps: DoubleTap = new DoubleTap();
  private readonly transcripts: TranscriptFeed = new TranscriptFeed(window.radar);
  private readonly handsFree: HandsFree;
  private readonly indicator: HandsFreeIndicator;
  private readonly router: DictationRouter;
  private readonly voices: Set<FieldVoice> = new Set();
  // The field whose push-to-talk dictation last took the microphone.
  private talking: FieldVoice | null = null;
  // The last hands-free target: a segment can still fail after its field stopped being the target.
  private lastTarget: VoiceField | null = null;
  private handsFreeState: HandsFreeState = 'off';

  constructor(indicator: HTMLButtonElement) {
    this.handsFree = new HandsFree({
      onState: (state: HandsFreeState): void => this.showHandsFree(state),
      onMoved: (): void => this.moved(),
      onError: (message: string): void => this.showHandsFreeError(message),
      onWords: (): void => this.focusTarget(),
    });
    this.indicator = new HandsFreeIndicator(indicator, (): number => this.handsFree.level(), (): void => this.handsFree.turnOff());
    this.router = new DictationRouter((place: DictationPlace | null): void => this.handsFree.follow(place));
    this.listenForOtherKeys();
    this.listenForDoubleTapAnywhere();
    // Orbit Web has no dictation; the desktop window picks the mode up where the last run left it.
    if (!isWebHost() && wasHandsFreeOn()) this.handsFree.turnOn(Promise.resolve());
  }

  attach(field: VoiceField): FieldVoice {
    const voice: FieldVoice = new FieldVoice(field, this.transcripts, {
      holdStart: (held: FieldVoice): void => this.holdStart(held),
      tap: (tapped: FieldVoice, pressedAt: number): void => this.tapInField(tapped, pressedAt),
      mic: (): void => this.toggleFromMic(),
      edited: (edited: FieldVoice): void => this.handsFree.edited(edited.field),
      dictationChanged: (): void => this.showStates(),
    });
    this.voices.add(voice);
    voice.show('idle');
    return voice;
  }

  // A tile taken out of the Panel: its dictation ends and its field is forgotten.
  detach(voice: FieldVoice): void {
    voice.dispose();
    this.voices.delete(voice);
    if (this.talking === voice) this.talking = null;
    if (this.lastTarget === voice.field) this.lastTarget = null;
  }

  // Hands-free words follow the side panel's chat; null when it has no composer to write to.
  followDrawer(place: DictationPlace | null): void {
    this.router.followDrawer(place);
  }

  // Hands-free words follow the focused tile while the Panel is on screen; null when no tile has focus.
  followTile(place: DictationPlace | null): void {
    this.router.followTile(place);
  }

  showSurface(surface: VoiceSurface): void {
    this.router.showSurface(surface);
  }

  // Space outside any text field while a chat is open; its composer already has focus.
  pressOutside(voice: FieldVoice): void {
    if (this.taps.press(performance.now())) return this.doubleTapped(voice);
    if (!this.handsFree.isBusy) this.startDictation(voice);
  }

  // Another chat's draft is coming in: a push-to-talk dictation ends; hands-free follows the composer instead.
  cancel(voice: FieldVoice): void {
    void voice.dictation.cancel();
  }

  // Sending ends dictation, so late words cannot bring the sent text back; hands-free keeps listening.
  messageSent(voice: FieldVoice): void {
    void voice.dictation.cancel();
    this.handsFree.discard(voice.field);
  }

  level(): number {
    if (this.handsFree.isBusy) return this.handsFree.level();
    return this.talking?.dictation.level() ?? 0;
  }

  private holdStart(voice: FieldVoice): void {
    // A hold is never half of a double tap; while the mic is on hands-free, holding adds nothing.
    this.taps.forget();
    if (!this.handsFree.isBusy) this.startDictation(voice);
  }

  private tapInField(voice: FieldVoice, pressedAt: number): void {
    if (this.taps.press(pressedAt)) return this.doubleTapped(voice);
    if (this.handsFree.isOn) voice.spaces.defer();
    else if (voice.dictation.listening) voice.dictation.release();
    else voice.spaces.type();
  }

  // The first tap's space was not meant as text.
  private doubleTapped(voice: FieldVoice): void {
    voice.spaces.takeBack();
    if (this.handsFree.isOn) this.handsFree.turnOff();
    else this.turnHandsFreeOn();
  }

  private toggleFromMic(): void {
    const press: MicPress = micPress(this.handsFree.isOn, this.handsFree.isBusy);
    if (press === 'turn-off') this.handsFree.turnOff();
    else if (press === 'turn-on') this.turnHandsFreeOn();
  }

  // A push-to-talk dictation in progress gives way: its words stay, and the microphone reopens hands-free.
  private turnHandsFreeOn(): void {
    this.handsFree.turnOn(this.talking?.dictation.cancel() ?? Promise.resolve());
  }

  // One dictation at a time: one started in another field gives the microphone back first.
  private startDictation(voice: FieldVoice): void {
    const ready: Promise<void> = this.releaseMicrophone(voice);
    this.talking = voice;
    voice.dictation.start(ready);
  }

  // Cancels another field's dictation while it holds the microphone; one already refining its final text keeps
  // going, since that text lands in its own field.
  private releaseMicrophone(keep: FieldVoice): Promise<void> {
    const holder: FieldVoice | null = this.talking;
    if (holder === null || holder === keep || !holder.dictation.isRecording) return Promise.resolve();
    return holder.dictation.cancel();
  }

  // Any other key between two Space presses means typing, not a double tap ("a b" typed fast).
  private listenForOtherKeys(): void {
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== TALK_KEY) this.taps.forget();
    }, true);
  }

  // With no composer focused, Space belongs to the view, but a double tap still turns hands-free off. Listening on
  // the window runs after the composers' own Space handling, which marks the presses it took as handled.
  private listenForDoubleTapAnywhere(): void {
    window.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !this.handsFree.isOn || !isPlainSpace(event) || isTextField(event.target)) return;
      if (!this.taps.press(performance.now())) return;
      event.preventDefault();
      this.handsFree.turnOff();
    });
  }

  private moved(): void {
    this.lastTarget = this.handsFree.field ?? this.lastTarget;
    this.showStates();
    this.focusTarget();
  }

  // While hands-free listens its composer holds the caret, so Backspace and Enter act on the words as they come.
  // Another text field the user is typing in (a rename, a search) keeps its focus.
  private focusTarget(): void {
    const field: VoiceField | null = this.handsFree.isOn ? this.handsFree.field : null;
    if (field === null || document.activeElement === field.input || isTextField(document.activeElement)) return;
    field.input.focus({ preventScroll: true });
  }

  private showHandsFreeError(message: string): void {
    const field: VoiceField | null = this.handsFree.field ?? this.lastTarget;
    if (field === null) console.error(message);
    else field.showError(message);
  }

  private showHandsFree(state: HandsFreeState): void {
    this.handsFreeState = state;
    // Finishing is the tail of turning off; paused is still on, only with no composer to write to.
    if (state !== 'finishing') rememberHandsFree(state !== 'off');
    this.indicator.show(state);
    this.showStates();
    this.focusTarget();
  }

  // Hands-free, while running, decides what its target field shows; every other field shows its own dictation.
  private showStates(): void {
    const target: VoiceField | null = this.handsFree.field;
    this.voices.forEach((voice: FieldVoice): void => {
      const handsFree: HandsFreeState = voice.field === target ? this.handsFreeState : 'off';
      voice.show(composerState(handsFree, voice.pushToTalkState));
    });
  }
}

function isPlainSpace(event: KeyboardEvent): boolean {
  return event.key === TALK_KEY && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey;
}
