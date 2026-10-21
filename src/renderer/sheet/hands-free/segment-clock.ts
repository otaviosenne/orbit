// No new words for this long, with the room quiet, ends the utterance: its text is finalized while the next
// one starts streaming. Longer than the voice service's own 1 s utterance end, so a breath does not split it.
export const PAUSE_MS: number = 1500;
// The service only finalizes a stream when it is closed; capping a stream bounds what an unfinalized (or
// dropped) stream can hold, and stays under the 60 s a pre-warmed connection waits for the next segment.
export const MAX_SEGMENT_MS: number = 45_000;
// Past the cap, wait for a short quiet moment so no word is cut in two ...
export const QUIET_GAP_MS: number = 300;
// ... but not forever: in a noisy room the stream is cut this long after the cap anyway.
export const MAX_OVERRUN_MS: number = 10_000;
// RMS of a raw (unprocessed) microphone in a quiet room sits well below this; even soft speech rises above it.
export const SILENCE_LEVEL: number = 0.01;

export type SegmentEnd = 'pause' | 'length';

// Times one hands-free segment from its audio chunks and transcript, never from timers or animation frames
// (both stall while the window is hidden, the microphone does not).
export class SegmentClock {
  private lastTextAt: number | null = null;
  private quietSince: number | null = null;

  constructor(private readonly startedAt: number) {}

  heard(level: number, now: number): void {
    if (level >= SILENCE_LEVEL) this.quietSince = null;
    else this.quietSince ??= now;
  }

  wrote(now: number): void {
    this.lastTextAt = now;
  }

  due(now: number): SegmentEnd | null {
    const age: number = now - this.startedAt;
    const isQuiet: boolean = this.quietSince !== null && now - this.quietSince >= QUIET_GAP_MS;
    if (this.lastTextAt !== null && now - this.lastTextAt >= PAUSE_MS && isQuiet) return 'pause';
    if (age >= MAX_SEGMENT_MS + MAX_OVERRUN_MS) return 'length';
    if (age >= MAX_SEGMENT_MS && isQuiet) return 'length';
    return null;
  }
}
