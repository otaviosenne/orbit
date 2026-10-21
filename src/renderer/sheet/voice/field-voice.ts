import type { DictationState } from '../dictation';
import { Dictation } from '../dictation';
import { SpaceTyping } from '../hands-free/space-typing';
import { MICROPHONE_ICON } from '../../icons';
import { PushToTalk } from '../push-to-talk';
import type { TranscriptFeed } from './transcript-feed';
import type { VoiceField } from './voice-field';

export const MIC_TITLE: string = 'Talk (or hold Space)';

// What a field's keys and mic ask of the voice shared by every composer (the double tap, hands-free, the one
// dictation at a time).
export interface FieldVoiceRoutes {
  readonly holdStart: (voice: FieldVoice) => void;
  readonly tap: (voice: FieldVoice, pressedAt: number) => void;
  readonly mic: (voice: FieldVoice) => void;
  readonly edited: (voice: FieldVoice) => void;
  readonly dictationChanged: () => void;
}

// One composer field's share of voice input: its push-to-talk dictation, its Space key and its mic button.
export class FieldVoice {
  readonly dictation: Dictation;
  readonly spaces: SpaceTyping;
  private dictationState: DictationState = 'idle';
  private shown: DictationState | null = null;

  constructor(readonly field: VoiceField, transcripts: TranscriptFeed, routes: FieldVoiceRoutes) {
    this.spaces = new SpaceTyping(field.input);
    this.dictation = new Dictation(field.input, transcripts, {
      onState: (state: DictationState): void => {
        this.dictationState = state;
        routes.dictationChanged();
      },
      onError: (message: string): void => field.showError(message),
      onDraft: (): void => field.draftChanged(),
      mayRefocus: (): boolean => field.mayRefocus(),
    });
    field.input.addEventListener('input', (): void => routes.edited(this));
    new PushToTalk(field.input, {
      onPress: (): void => window.radar.prepareDictation(),
      onHoldStart: (): void => routes.holdStart(this),
      onHoldEnd: (): void => this.dictation.release(),
      onTap: (pressedAt: number): void => routes.tap(this, pressedAt),
    });
    this.setUpMic(routes);
  }

  get pushToTalkState(): DictationState {
    return this.dictationState;
  }

  // Updates the field only when what it shows changes, so a running level meter is not restarted.
  show(state: DictationState): void {
    if (state === this.shown) return;
    this.shown = state;
    this.field.showState(state);
  }

  dispose(): void {
    this.dictation.dispose();
  }

  private setUpMic(routes: FieldVoiceRoutes): void {
    const mic: HTMLButtonElement = this.field.mic;
    mic.innerHTML = MICROPHONE_ICON;
    mic.title = MIC_TITLE;
    // Keep focus (and the caret) in the text field when the mic is pressed.
    mic.addEventListener('mousedown', (event: MouseEvent): void => event.preventDefault());
    mic.addEventListener('click', (): void => {
      this.field.input.focus();
      routes.mic(this);
    });
  }
}
