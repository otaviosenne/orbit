import type { DictationState } from '../dictation';
import type { HandsFreeState } from './hands-free';

// The composer shows one dictation state; hands-free, while running, decides it.
export function composerState(handsFree: HandsFreeState, dictation: DictationState): DictationState {
  if (handsFree === 'live') return 'listening';
  if (handsFree === 'finishing') return 'refining';
  return dictation;
}
