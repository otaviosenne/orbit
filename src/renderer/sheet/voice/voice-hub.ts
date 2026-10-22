import { isTouchWeb, isWebHost } from '../../host';
import { setVoiceActive } from '../../voice-nav/voice-activity';
import { suspendCaptureAudio } from '../capture-context';
import { rememberHandsFree, wasHandsFreeOn } from '../hands-free/hands-free-memory';
import { composerState } from '../hands-free/composer-state';
import { DoubleTap } from '../hands-free/double-tap';
import { HandsFree } from '../hands-free/hands-free';
import type { HandsFreeState } from '../hands-free/hands-free';
import { HandsFreeIndicator } from '../hands-free/hands-free-indicator';
import { isTextField } from '../space-to-talk';
import type { DictationPlace } from './dictation-place';
import { createCommandPlace } from './commands/command-place';
import { DictationRouter } from './dictation-router';
import { FieldVoice } from './field-voice';
import type { MicPress } from './mic-press';
import { micPress } from './mic-press';
import { onPageHidden } from './page-hidden';
import { usesSpaceGestures } from './space-gestures';
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
  // Closing the window stops the microphone, which turns hands-free off by itself; that is the window going away, not
  // the user turning it off, so it must not be remembered (it would come back off after every restart).
  private isUnloading: boolean = false;

  constructor(indicator: HTMLButtonElement) {
    this.handsFree = new HandsFree({
      onState: (state: HandsFreeState): void => this.showHandsFree(state),
      onMoved: (): void => this.moved(),
      onError: (message: string): void => this.showHandsFreeError(message),
      onWords: (): void => this.focusTarget(),
    });
    this.indicator = new HandsFreeIndicator(indicator, (): number => this.handsFree.level(), (): void => this.toggleFromMic());
    // The mic shows from the start, faded; the mode's own reports only come when it changes.
    this.indicator.show('off');
    this.router = new DictationRouter((place: DictationPlace | null): void => this.handsFree.follow(place), createCommandPlace());
    // Nothing is on screen yet: hands-free starts out listening for commands only.
    this.router.showSurface('drawer');
    if (usesSpaceGestures()) {
      this.listenForOtherKeys();
      this.listenForDoubleTapAnywhere();
    }
    // The desktop window picks the mode up where the last run left it. A browser never does: it opens the microphone
    // only on a tap, and an unexpected open mic on a phone is the worse mistake.
    for (const type of ['pagehide', 'beforeunload'] as const) window.addEventListener(type, (): void => void (this.isUnloading = true));
    if (!isWebHost() && wasHandsFreeOn()) this.handsFree.turnOn(Promise.resolve());
    if (isWebHost()) onPageHidden((): void => this.stopListening());
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

  // The page is going away (screen locked, app switched): what was heard is finalized and the microphone released.
  private stopListening(): void {
    this.handsFree.turnOff();
    if (this.talking?.dictation.listening === true) this.talking.dictation.release();
    suspendCaptureAudio();
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
  // Another text field the user is typing in (a rename, a search) keeps its focus. A touch screen is left alone:
  // focusing there raises the on-screen keyboard over the thread.
  private focusTarget(): void {
    const field: VoiceField | null = this.handsFree.isOn && !isTouchWeb() ? this.handsFree.field : null;
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
    // Remembered for the desktop's next start only; Orbit Web never turns it back on by itself.
    if (state !== 'finishing' && !isWebHost() && !this.isUnloading) rememberHandsFree(state !== 'off');
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
    this.showVoiceActivity();
  }

  // The chat number badges are on screen only while a spoken command can be heard.
  private showVoiceActivity(): void {
    setVoiceActive(this.handsFree.isOn || [...this.voices].some((voice: FieldVoice): boolean => voice.dictation.listening));
  }
}

function isPlainSpace(event: KeyboardEvent): boolean {
  return event.key === TALK_KEY && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey;
}
