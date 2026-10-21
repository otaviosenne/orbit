import { describe, expect, it } from 'vitest';
import { MIN_TAKE_MS, noSpeechNotice } from '../src/renderer/sheet/voice/no-speech-notice';
import { MUTED_LEVEL, MUTED_MIC_MESSAGE, NO_SPEECH_MESSAGE, SpeechPresence } from '../src/renderer/sheet/voice/speech-presence';
import { SILENCE_LEVEL } from '../src/renderer/sheet/hands-free/segment-clock';

const DIGITAL_ZERO: number = 0;
const QUIET_ROOM: number = SILENCE_LEVEL / 2;
const CHUNK_MS: number = 64;

function take(levels: readonly number[]): SpeechPresence {
  const presence: SpeechPresence = new SpeechPresence();
  levels.forEach((level: number, index: number): void => presence.heard(level, index * CHUNK_MS));
  return presence;
}

function chunksFor(ms: number, level: number): number[] {
  return Array.from({ length: Math.ceil(ms / CHUNK_MS) + 1 }, (): number => level);
}

describe('SpeechPresence', () => {
  it('measures the audio from the first chunk to the last', () => {
    expect(take([]).heardMs()).toBe(0);
    expect(take([DIGITAL_ZERO]).heardMs()).toBe(0);
    expect(take([DIGITAL_ZERO, DIGITAL_ZERO, DIGITAL_ZERO]).heardMs()).toBe(CHUNK_MS * 2);
  });

  it('calls only digital silence muted, not a quiet room', () => {
    expect(take([DIGITAL_ZERO, MUTED_LEVEL / 2]).wasMuted()).toBe(true);
    expect(take([QUIET_ROOM]).wasMuted()).toBe(false);
  });

  it('stops being muted after a single chunk with sound', () => {
    expect(take([DIGITAL_ZERO, MUTED_LEVEL, DIGITAL_ZERO]).wasMuted()).toBe(false);
  });

  it('says nothing about a microphone that delivered no audio', () => {
    expect(take([]).wasMuted()).toBe(false);
  });
});

describe('noSpeechNotice', () => {
  it('stays quiet for a take that showed words', () => {
    expect(noSpeechNotice(take(chunksFor(MIN_TAKE_MS, DIGITAL_ZERO)), true)).toBeNull();
  });

  it('stays quiet for a take too short to have been meant', () => {
    expect(noSpeechNotice(take(chunksFor(MIN_TAKE_MS / 2, DIGITAL_ZERO)), false)).toBeNull();
  });

  it('asks about the microphone when it delivered only digital silence', () => {
    expect(noSpeechNotice(take(chunksFor(MIN_TAKE_MS, DIGITAL_ZERO)), false)).toBe(MUTED_MIC_MESSAGE);
  });

  it('reports no speech when the microphone heard the room but no words came', () => {
    expect(noSpeechNotice(take(chunksFor(MIN_TAKE_MS, QUIET_ROOM)), false)).toBe(NO_SPEECH_MESSAGE);
  });
});
