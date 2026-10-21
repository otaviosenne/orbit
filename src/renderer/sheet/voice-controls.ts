import { requireElement } from '../dom';
import { Dictation } from './dictation';
import type { DictationState } from './dictation';
import { composerState } from './hands-free/composer-state';
import type { DictationTarget } from './hands-free/dictation-target';
import { DoubleTap } from './hands-free/double-tap';
import { HandsFree } from './hands-free/hands-free';
import type { HandsFreeState } from './hands-free/hands-free';
import { HandsFreeIndicator } from './hands-free/hands-free-indicator';
import { SpaceTyping } from './hands-free/space-typing';
import type { KeptDrafts } from './hands-free/span-writer';
import { PushToTalk } from './push-to-talk';
import { isTextField } from './space-to-talk';

const TALK_KEY: string = ' ';

export interface VoiceControlsHooks {
  // What the composer shows: listening, refining or idle, whichever kind of dictation is running.
  readonly onState: (state: DictationState) => void;
  readonly onError: (message: string) => void;
  // The draft text changed under the caret (live words or the final text).
  readonly onDraft: () => void;
  readonly drafts: KeptDrafts;
}

// Routes Space, the mic button and sending between push-to-talk dictation and the hands-free mode.
// Hold Space to talk; tap it to start or stop; double tap it to keep the mic on until the next double tap.
export class VoiceControls {
  private readonly taps: DoubleTap = new DoubleTap();
  private readonly spaces: SpaceTyping;
  private readonly dictation: Dictation;
  private readonly handsFree: HandsFree;
  private readonly indicator: HandsFreeIndicator;
  private dictationState: DictationState = 'idle';
  private handsFreeState: HandsFreeState = 'off';

  constructor(input: HTMLTextAreaElement, mic: HTMLButtonElement, private readonly hooks: VoiceControlsHooks) {
    this.spaces = new SpaceTyping(input);
    this.dictation = new Dictation(input, {
      onState: (state: DictationState): void => this.showDictation(state),
      onError: hooks.onError,
      onDraft: hooks.onDraft,
    });
    this.handsFree = new HandsFree(input, {
      onState: (state: HandsFreeState): void => this.showHandsFree(state),
      onError: hooks.onError,
      onDraft: hooks.onDraft,
      drafts: hooks.drafts,
    });
    this.indicator = new HandsFreeIndicator(requireElement('#hands-free-indicator'), (): number => this.handsFree.level(), (): void =>
      this.handsFree.turnOff(),
    );
    new PushToTalk(input, {
      onPress: (): void => window.radar.prepareDictation(),
      onHoldStart: (): void => this.holdStart(),
      onHoldEnd: (): void => this.dictation.release(),
      onTap: (pressedAt: number): void => this.tapInField(pressedAt),
    });
    mic.addEventListener('click', (): void => {
      input.focus();
      this.toggleFromMic();
    });
    this.listenForOtherKeys();
    this.listenForDoubleTapAnywhere();
  }

  // Space outside any text field while a chat is open; the composer already has focus.
  pressOutside(): void {
    if (this.taps.press(performance.now())) return this.doubleTapped();
    if (!this.handsFree.isBusy) this.dictation.start();
  }

  follow(target: DictationTarget | null): void {
    this.handsFree.follow(target);
  }

  // Another chat's draft is coming in: a push-to-talk dictation ends; hands-free follows the panel instead.
  cancel(): void {
    void this.dictation.cancel();
  }

  // Sending ends dictation, so late words cannot bring the sent text back; hands-free keeps listening.
  messageSent(): void {
    void this.dictation.cancel();
    this.handsFree.discard();
  }

  level(): number {
    return this.handsFree.isBusy ? this.handsFree.level() : this.dictation.level();
  }

  private holdStart(): void {
    // A hold is never half of a double tap; while the mic is on hands-free, holding adds nothing.
    this.taps.forget();
    if (!this.handsFree.isBusy) this.dictation.start();
  }

  private tapInField(pressedAt: number): void {
    if (this.taps.press(pressedAt)) return this.doubleTapped();
    if (this.handsFree.isOn) this.spaces.defer();
    else if (this.dictation.listening) this.dictation.release();
    else this.spaces.type();
  }

  // The dictation the first tap started (if any) gives way: its words stay, the mic is reopened hands-free.
  private doubleTapped(): void {
    this.spaces.takeBack();
    if (this.handsFree.isOn) this.handsFree.turnOff();
    else this.handsFree.turnOn(this.dictation.cancel());
  }

  private toggleFromMic(): void {
    if (this.handsFree.isOn) this.handsFree.turnOff();
    else if (!this.handsFree.isBusy) this.dictation.toggle();
  }

  // Any other key between two Space presses means typing, not a double tap ("a b" typed fast).
  private listenForOtherKeys(): void {
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== TALK_KEY) this.taps.forget();
    }, true);
  }

  // With the panel closed, Space belongs to the board, but a double tap still turns hands-free off. Listening on
  // the window runs after the panel's own Space handling, which marks the presses it took as handled.
  private listenForDoubleTapAnywhere(): void {
    window.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !this.handsFree.isOn || !isPlainSpace(event) || isTextField(event.target)) return;
      if (!this.taps.press(performance.now())) return;
      event.preventDefault();
      this.handsFree.turnOff();
    });
  }

  private showDictation(state: DictationState): void {
    this.dictationState = state;
    this.hooks.onState(composerState(this.handsFreeState, this.dictationState));
  }

  private showHandsFree(state: HandsFreeState): void {
    this.handsFreeState = state;
    this.indicator.show(state);
    this.hooks.onState(composerState(this.handsFreeState, this.dictationState));
  }
}

function isPlainSpace(event: KeyboardEvent): boolean {
  return event.key === TALK_KEY && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey;
}
