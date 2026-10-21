import type { DictationTarget } from '../hands-free/dictation-target';
import type { KeptDraft } from './kept-draft';
import type { VoiceField } from './voice-field';

// A hands-free target together with its field, and where its last words go once it is left (null drops them).
export interface DictationPlace {
  readonly target: DictationTarget;
  readonly field: VoiceField;
  readonly kept: KeptDraft | null;
}
