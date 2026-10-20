import { describe, expect, it } from 'vitest';
import { TranscriptAccumulator } from '../src/main/transcript-accumulator';

describe('TranscriptAccumulator', () => {
  it('replaces the utterance in progress and keeps closed utterances in order', () => {
    const transcript: TranscriptAccumulator = new TranscriptAccumulator();
    transcript.update('Eu');
    transcript.update('Eu gostaria');
    transcript.endUtterance();
    transcript.update('de um radar');
    expect(transcript.text).toBe('Eu gostaria de um radar');
    transcript.endUtterance();
    transcript.endUtterance();
    expect(transcript.text).toBe('Eu gostaria de um radar');
  });
});
