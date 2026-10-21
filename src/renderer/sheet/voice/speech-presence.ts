// Below this RMS the microphone delivers digital zero or dither: it is muted, switched off or not the one in use.
// A live microphone in a quiet room sits around 100 times higher, so someone thinking in silence never counts.
export const MUTED_LEVEL: number = 0.0001;

export const NO_SPEECH_MESSAGE: string = 'No speech detected';
export const MUTED_MIC_MESSAGE: string = 'No speech detected — is your microphone on?';

// What the microphone delivered over one take, from its audio chunks (never from timers or animation frames, which
// stall while the window is hidden).
export class SpeechPresence {
  private firstHeardAt: number | null = null;
  private lastHeardAt: number | null = null;
  private isMuted: boolean = true;

  heard(level: number, now: number): void {
    this.firstHeardAt ??= now;
    this.lastHeardAt = now;
    if (level >= MUTED_LEVEL) this.isMuted = false;
  }

  // How much audio arrived: 0 until the microphone delivers its second chunk.
  heardMs(): number {
    if (this.firstHeardAt === null || this.lastHeardAt === null) return 0;
    return this.lastHeardAt - this.firstHeardAt;
  }

  // Every chunk so far was digital silence; a take that heard nothing tells nothing about the microphone.
  wasMuted(): boolean {
    return this.firstHeardAt !== null && this.isMuted;
  }
}
