import type { DictationEngine } from '../main/remote/dictation/dictation-engine';
import type { DictationStart, TranscriptionResult } from '../shared/types';

const NOTHING_HEARD: TranscriptionResult = { ok: true, text: '', error: null };

// Orbit Web's dictation in the demo, like the desktop demo's: sessions open and close, nothing reaches the network,
// and no words come back.
export class DemoDictationEngine implements DictationEngine {
  private session: number = 0;

  prepare(): void {}

  begin(): Promise<DictationStart> {
    return Promise.resolve({ session: ++this.session, error: null });
  }

  feed(): void {}

  finish(): Promise<TranscriptionResult> {
    return Promise.resolve(NOTHING_HEARD);
  }

  cancel(): void {}

  stop(): void {}
}
