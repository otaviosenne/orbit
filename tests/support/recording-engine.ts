import type { DictationEngine, SessionTranscriptListener } from '../../src/main/remote/dictation/dictation-engine';
import type { DictationStart, TranscriptionResult } from '../../src/shared/types';

export const HEARD_TEXT: string = 'olá';
export const FINAL_TEXT: string = 'olá mundo';

// Records every step it is asked for; each fed chunk echoes a live transcript, as the voice service would.
export class RecordingEngine implements DictationEngine {
  readonly steps: string[] = [];
  private session: number = 0;
  private listener: SessionTranscriptListener | null = null;
  // Set to hold begin() until the test releases it.
  beginGate: Promise<void> = Promise.resolve();

  prepare(): void {
    this.steps.push('prepare');
  }

  async begin(listener: SessionTranscriptListener): Promise<DictationStart> {
    await this.beginGate;
    this.listener = listener;
    this.session += 1;
    this.steps.push(`begin ${this.session}`);
    return { session: this.session, error: null };
  }

  feed(session: number, pcm: Uint8Array): void {
    this.steps.push(`feed ${session} ${pcm.byteLength}`);
    this.listener?.(session, HEARD_TEXT);
  }

  finish(session: number): Promise<TranscriptionResult> {
    this.steps.push(`finish ${session}`);
    return Promise.resolve({ ok: true, text: FINAL_TEXT, error: null });
  }

  cancel(session: number): void {
    this.steps.push(`cancel ${session}`);
  }

  stop(): void {
    this.steps.push('stop');
  }
}
