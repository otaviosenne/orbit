import type { SpeechPresence } from './speech-presence';
import { MUTED_MIC_MESSAGE, NO_SPEECH_MESSAGE } from './speech-presence';

// Shorter takes are a Space held a moment too long or a mic clicked twice; a red line after those is only noise.
export const MIN_TAKE_MS: number = 800;

// What a push-to-talk take that produced no words should say, or null when it should stay quiet.
export function noSpeechNotice(presence: SpeechPresence, sawWords: boolean): string | null {
  if (sawWords || presence.heardMs() < MIN_TAKE_MS) return null;
  return presence.wasMuted() ? MUTED_MIC_MESSAGE : NO_SPEECH_MESSAGE;
}
