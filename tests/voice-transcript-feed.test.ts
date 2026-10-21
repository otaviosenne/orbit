import { describe, expect, it } from 'vitest';
import type { DictationTranscript } from '../src/shared/types';
import type { TranscriptListener, TranscriptSource } from '../src/renderer/sheet/voice/transcript-feed';
import { TranscriptFeed } from '../src/renderer/sheet/voice/transcript-feed';

interface FakeSource {
  readonly source: TranscriptSource;
  emit(transcript: DictationTranscript): void;
}

function fakeSource(): FakeSource {
  const listeners: TranscriptListener[] = [];
  return {
    source: { onDictationTranscript: (listener: TranscriptListener): void => void listeners.push(listener) },
    emit: (transcript: DictationTranscript): void => listeners.forEach((listener: TranscriptListener): void => listener(transcript)),
  };
}

describe('TranscriptFeed', () => {
  it('listens to the bridge once and passes each transcript to every subscriber', () => {
    const { source, emit } = fakeSource();
    let bridgeListeners: number = 0;
    const counting: TranscriptSource = {
      onDictationTranscript: (listener: TranscriptListener): void => {
        bridgeListeners++;
        source.onDictationTranscript(listener);
      },
    };
    const feed: TranscriptFeed = new TranscriptFeed(counting);
    const first: DictationTranscript[] = [];
    const second: DictationTranscript[] = [];
    feed.subscribe((transcript: DictationTranscript): void => void first.push(transcript));
    feed.subscribe((transcript: DictationTranscript): void => void second.push(transcript));
    emit({ session: 1, text: 'hello' });
    expect(bridgeListeners).toBe(1);
    expect(first).toEqual([{ session: 1, text: 'hello' }]);
    expect(second).toEqual([{ session: 1, text: 'hello' }]);
  });

  it('stops passing transcripts to a field that is gone', () => {
    const { source, emit } = fakeSource();
    const feed: TranscriptFeed = new TranscriptFeed(source);
    const heard: string[] = [];
    const unsubscribe: () => void = feed.subscribe((transcript: DictationTranscript): void => void heard.push(transcript.text));
    emit({ session: 1, text: 'before' });
    unsubscribe();
    emit({ session: 1, text: 'after' });
    expect(heard).toEqual(['before']);
  });
});
