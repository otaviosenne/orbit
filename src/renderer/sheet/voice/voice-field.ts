import type { DictationState } from '../dictation';

// A text field dictated words can be written into, outside of any running dictation's own bookkeeping.
export interface DraftField {
  readonly input: HTMLTextAreaElement;
  // Dictation changed the draft without an input event (live words or the final text).
  draftChanged(): void;
}

// A composer's text field with its mic: the side panel's or a Panel tile's.
export interface VoiceField extends DraftField {
  readonly mic: HTMLButtonElement;
  // What the field shows: listening, refining or idle, whichever kind of dictation is running.
  showState(state: DictationState): void;
  showError(message: string): void;
  // Whether a dictation that just finished may put the focus back into this field.
  mayRefocus(): boolean;
}
