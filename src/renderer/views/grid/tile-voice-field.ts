import { element } from '../../dom';
import type { DictationState } from '../../sheet/dictation';
import { isTextField } from '../../sheet/space-to-talk';
import { DictationDisplay, createVoiceBars } from '../../sheet/voice/dictation-display';
import type { DictationPlace } from '../../sheet/voice/dictation-place';
import type { KeptDraft } from '../../sheet/voice/kept-draft';
import { isPickingText } from '../../sheet/voice/text-picking';
import type { VoiceField } from '../../sheet/voice/voice-field';
import type { VoiceHub } from '../../sheet/voice/voice-hub';

export interface TileVoiceHooks {
  // Dictation wrote into the draft, which fires no input event: Send has to look at it again.
  readonly draftChanged: () => void;
  readonly showError: (message: string) => void;
}

// A tile composer's text field as a voice field: the textarea and its mic in one box, with the bars that stand in
// for the caret while dictating, like the side panel's composer.
export class TileVoiceField implements VoiceField {
  readonly box: HTMLDivElement = element('div', 'tile-composer-box');
  readonly mic: HTMLButtonElement = element('button', 'composer-mic tile-composer-mic');
  private readonly display: DictationDisplay;
  private state: DictationState = 'idle';

  constructor(readonly input: HTMLTextAreaElement, host: HTMLElement, hub: VoiceHub, private readonly hooks: TileVoiceHooks) {
    this.mic.type = 'button';
    const bars: HTMLElement = createVoiceBars();
    this.box.append(input, bars, this.mic);
    this.display = new DictationDisplay({ host, box: this.box, input, bars }, (): number => hub.level());
  }

  // Idle unless a dictation is listening into this field or refining its words.
  get isDictating(): boolean {
    return this.state !== 'idle';
  }

  get hasFocus(): boolean {
    return document.activeElement === this.input;
  }

  // This field as the hands-free target of the tile showing sessionId.
  place(sessionId: string): DictationPlace {
    return { target: { kind: 'tile', sessionId }, field: this, kept: this.keptDraft() };
  }

  showState(state: DictationState): void {
    this.state = state;
    this.display.show(state);
  }

  draftChanged(): void {
    this.display.placeBars();
    this.hooks.draftChanged();
  }

  showError(message: string): void {
    this.hooks.showError(message);
  }

  // Words said here before focus moved to another tile finish in this field, unless it was written in since or is
  // the target again (its new words are then on their way).
  private keptDraft(): KeptDraft {
    return {
      text: (): string => this.input.value,
      replace: (expected: string, next: string): void => {
        if (this.hasFocus || this.input.value !== expected) return;
        this.input.value = next;
        this.hooks.draftChanged();
      },
    };
  }

  // Many tiles sit side by side: words finishing in one must not pull the focus away from another composer.
  mayRefocus(): boolean {
    return !isTextField(document.activeElement) && !isPickingText();
  }
}
