import { SpeechPresence } from '../voice/speech-presence';

// Long enough that the microphone's own start-up silence never trips it, short enough to warn before a whole
// sentence is lost.
export const SILENT_MIC_ALARM_MS: number = 4000;

// Hands-free has no end of take to judge, and saying nothing is normal there; only a microphone that delivers digital
// silence from the moment it opens is worth a warning, and only once per time hands-free is turned on.
export class SilentMicAlarm {
  private readonly presence: SpeechPresence = new SpeechPresence();
  private isArmed: boolean = true;

  // True exactly once: on the chunk that completes the silent stretch. Any sound before that disarms it for good.
  heard(level: number, now: number): boolean {
    if (!this.isArmed) return false;
    this.presence.heard(level, now);
    if (!this.presence.wasMuted()) this.isArmed = false;
    else if (this.presence.heardMs() >= SILENT_MIC_ALARM_MS) {
      this.isArmed = false;
      return true;
    }
    return false;
  }
}
