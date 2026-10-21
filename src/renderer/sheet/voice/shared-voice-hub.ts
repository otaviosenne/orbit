import { requireElement } from '../../dom';
import { VoiceHub } from './voice-hub';

let hub: VoiceHub | null = null;

// The side panel and the Panel's tiles are built apart from each other, yet must share the one microphone.
export function sharedVoiceHub(): VoiceHub {
  hub ??= new VoiceHub(requireElement('#hands-free-indicator'));
  return hub;
}
