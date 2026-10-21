import type { DictationStart, TranscriptionResult } from '../../../shared/types';

export type SessionTranscriptListener = (session: number, text: string) => void;

// What a browser's dictation socket drives: the desktop's DictationService in the app, a silent stand-in in the demo.
// One dictation at a time per engine; audio and results for an older session are ignored.
export interface DictationEngine {
  prepare(): void;
  begin(onTranscript: SessionTranscriptListener): Promise<DictationStart>;
  feed(session: number, pcm: Uint8Array): void;
  finish(session: number): Promise<TranscriptionResult>;
  cancel(session: number): void;
  // Closes every connection the engine holds, warm or in use.
  stop(): void;
}

// Each connected browser gets an engine of its own, so its sessions are out of every other browser's reach.
export type DictationEngineFactory = () => DictationEngine;
