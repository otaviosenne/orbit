import type { DictationTranscript } from '../../../shared/types';

export type TranscriptListener = (transcript: DictationTranscript) => void;

export interface TranscriptSource {
  onDictationTranscript(listener: TranscriptListener): void;
}

// The bridge's transcript listeners can never be removed; every composer field has a dictation of its own and tiles
// come and go, so the bridge is listened to once and each dictation subscribes here for as long as its field lives.
export class TranscriptFeed {
  private readonly listeners: Set<TranscriptListener> = new Set();

  constructor(source: TranscriptSource) {
    source.onDictationTranscript((transcript: DictationTranscript): void => this.listeners.forEach((listener: TranscriptListener): void => listener(transcript)));
  }

  // Returns the call that unsubscribes.
  subscribe(listener: TranscriptListener): () => void {
    this.listeners.add(listener);
    return (): void => void this.listeners.delete(listener);
  }
}
