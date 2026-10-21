import { describe, expect, it } from 'vitest';
import { decodeAudioFrame, encodeAudioFrame, MAX_AUDIO_FRAME_BYTES } from '../src/shared/dictation-audio-frame';
import type { AudioFrame } from '../src/shared/dictation-audio-frame';
import { MAX_WIRE_ID, parseDictationReply, parseDictationRequest } from '../src/shared/dictation-protocol';

const PCM: Uint8Array = new Uint8Array([1, 2, 3, 4, 5, 6]);
const SESSION_HEADER_BYTES: number = 4;

describe('dictation requests', () => {
  it('reads the four requests', () => {
    expect(parseDictationRequest('{"type":"prepare"}')).toEqual({ type: 'prepare' });
    expect(parseDictationRequest('{"type":"start","id":3}')).toEqual({ type: 'start', id: 3 });
    expect(parseDictationRequest('{"type":"finish","id":4,"session":2}')).toEqual({ type: 'finish', id: 4, session: 2 });
    expect(parseDictationRequest('{"type":"cancel","session":2}')).toEqual({ type: 'cancel', session: 2 });
  });

  it('refuses anything else instead of guessing', () => {
    const refused: readonly string[] = [
      'not json',
      '[]',
      'null',
      '{"type":"start"}',
      '{"type":"start","id":-1}',
      '{"type":"start","id":1.5}',
      `{"type":"start","id":${MAX_WIRE_ID + 1}}`,
      '{"type":"finish","id":1}',
      '{"type":"cancel","session":"1"}',
      '{"type":"stop"}',
      `{"type":"prepare","pad":"${'x'.repeat(300)}"}`,
    ];
    for (const raw of refused) expect(parseDictationRequest(raw), raw).toBeNull();
  });
});

describe('dictation replies', () => {
  it('reads started, finished and transcript', () => {
    expect(parseDictationReply('{"type":"started","id":1,"start":{"session":5,"error":null}}')).toEqual({ type: 'started', id: 1, start: { session: 5, error: null } });
    expect(parseDictationReply('{"type":"finished","id":2,"result":{"ok":true,"text":"oi","error":null}}')).toEqual({
      type: 'finished',
      id: 2,
      result: { ok: true, text: 'oi', error: null },
    });
    expect(parseDictationReply('{"type":"transcript","session":5,"text":"o"}')).toEqual({ type: 'transcript', session: 5, text: 'o' });
  });

  it('drops a reply it cannot read', () => {
    expect(parseDictationReply('{"type":"started","id":1,"start":{"session":"5"}}')).toBeNull();
    expect(parseDictationReply('{"type":"finished","id":2,"result":{"ok":"yes","text":"","error":null}}')).toBeNull();
    expect(parseDictationReply('{"type":"transcript","session":5}')).toBeNull();
  });
});

describe('audio frames', () => {
  it('carries the session and the samples', () => {
    const frame: AudioFrame | null = decodeAudioFrame(encodeAudioFrame(MAX_WIRE_ID, PCM));
    expect(frame?.session).toBe(MAX_WIRE_ID);
    expect(Array.from(frame?.pcm ?? [])).toEqual(Array.from(PCM));
  });

  it('reads a frame that sits inside a larger buffer', () => {
    const padded: Uint8Array = new Uint8Array(3 + SESSION_HEADER_BYTES + PCM.byteLength);
    padded.set(encodeAudioFrame(9, PCM), 3);
    expect(decodeAudioFrame(padded.subarray(3))?.session).toBe(9);
  });

  it('refuses empty, half-sample and oversized frames', () => {
    expect(decodeAudioFrame(new Uint8Array(SESSION_HEADER_BYTES))).toBeNull();
    expect(decodeAudioFrame(new Uint8Array(2))).toBeNull();
    expect(decodeAudioFrame(encodeAudioFrame(1, new Uint8Array(3)))).toBeNull();
    expect(decodeAudioFrame(new Uint8Array(MAX_AUDIO_FRAME_BYTES + 2))).toBeNull();
  });
});
