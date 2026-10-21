import { stripSendCommand } from './send-command';
import { sendOnVoiceCommand } from './voice-send';

// After the live words end in the send command, this much quiet sends them: short enough not to feel like waiting
// for the segment's pause and final pass, long enough that "enviar" said mid-thought can still be talked past.
export const VOICE_SEND_GRACE_MS: number = 600;

// Hands-free's quick send: every new batch of live words re-arms or cancels it, so only a command that is the last
// thing said goes out, and it goes out on the words already on screen instead of waiting for the final transcript.
export class VoiceSendTimer {
  private timer: number | null = null;

  wordsChanged(input: HTMLTextAreaElement): void {
    this.cancel();
    if (stripSendCommand(input.value) === null) return;
    this.timer = window.setTimeout((): void => {
      this.timer = null;
      sendOnVoiceCommand(input);
    }, VOICE_SEND_GRACE_MS);
  }

  cancel(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}
