import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOSE_GOING_AWAY, CLOSE_UNSUPPORTED_DATA } from '../src/main/remote/dictation/close-codes';
import { DictationClient } from '../src/main/remote/dictation/dictation-client';
import type { ReplyChannel } from '../src/main/remote/dictation/dictation-client';
import type { DictationLimits } from '../src/main/remote/dictation/dictation-limits';
import { encodeAudioFrame } from '../src/shared/dictation-audio-frame';
import type { DictationReply } from '../src/shared/dictation-protocol';
import { FINAL_TEXT, HEARD_TEXT, RecordingEngine } from './support/recording-engine';

const LIMITS: Pick<DictationLimits, 'audioIdleMs' | 'maxSessionMs' | 'connectionIdleMs'> = {
  audioIdleMs: 1_000,
  maxSessionMs: 20_000,
  connectionIdleMs: 10_000,
};
const CHUNK: Uint8Array = new Uint8Array(64);
const JUST_UNDER: number = 1;

interface Harness {
  readonly client: DictationClient;
  readonly engine: RecordingEngine;
  readonly replies: DictationReply[];
  readonly closes: number[];
}

function harness(): Harness {
  const engine: RecordingEngine = new RecordingEngine();
  const replies: DictationReply[] = [];
  const closes: number[] = [];
  const channel: ReplyChannel = { send: (reply: DictationReply): void => void replies.push(reply), close: (code: number): void => void closes.push(code) };
  return { client: new DictationClient(engine, channel, LIMITS), engine, replies, closes };
}

async function startSession(subject: Harness, id: number): Promise<void> {
  subject.client.receiveText(JSON.stringify({ type: 'start', id }));
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a browser’s dictation client', () => {
  it('starts, streams, shows live words and finishes', async () => {
    const subject: Harness = harness();
    subject.client.receiveText('{"type":"prepare"}');
    await startSession(subject, 1);
    subject.client.receiveAudio(encodeAudioFrame(1, CHUNK));
    subject.client.receiveText(JSON.stringify({ type: 'finish', id: 2, session: 1 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(subject.engine.steps).toEqual(['prepare', 'begin 1', `feed 1 ${CHUNK.byteLength}`, 'finish 1']);
    expect(subject.replies).toEqual([
      { type: 'started', id: 1, start: { session: 1, error: null } },
      { type: 'transcript', session: 1, text: HEARD_TEXT },
      { type: 'finished', id: 2, result: { ok: true, text: FINAL_TEXT, error: null } },
    ]);
  });

  it('only ever reaches its own engine, whatever session another browser names', async () => {
    const phone: Harness = harness();
    const tablet: Harness = harness();
    await startSession(phone, 1);
    await startSession(tablet, 1);
    tablet.client.receiveText('{"type":"cancel","session":1}');
    tablet.client.receiveAudio(encodeAudioFrame(1, CHUNK));
    tablet.client.closed();
    expect(phone.engine.steps).toEqual(['begin 1']);
    expect(tablet.engine.steps).toEqual(['begin 1', 'cancel 1', `feed 1 ${CHUNK.byteLength}`, 'stop']);
  });

  it('hangs up on a malformed message or frame and closes its voice connections', () => {
    const text: Harness = harness();
    text.client.receiveText('{"type":"start","id":"x"}');
    expect(text.closes).toEqual([CLOSE_UNSUPPORTED_DATA]);
    expect(text.engine.steps).toEqual(['stop']);
    const audio: Harness = harness();
    audio.client.receiveAudio(new Uint8Array(5));
    expect(audio.closes).toEqual([CLOSE_UNSUPPORTED_DATA]);
    expect(audio.engine.steps).toEqual(['stop']);
  });

  it('waits for the first chunk before timing out silence: the microphone prompt may take a while', async () => {
    const subject: Harness = harness();
    await startSession(subject, 1);
    await vi.advanceTimersByTimeAsync(LIMITS.audioIdleMs * 3);
    expect(subject.engine.steps).toEqual(['begin 1']);
    subject.client.receiveAudio(encodeAudioFrame(1, CHUNK));
    await vi.advanceTimersByTimeAsync(LIMITS.audioIdleMs - JUST_UNDER);
    expect(subject.engine.steps).not.toContain('cancel 1');
    await vi.advanceTimersByTimeAsync(JUST_UNDER);
    expect(subject.engine.steps).toContain('cancel 1');
  });

  it('stops timing a session once it is finished', async () => {
    const subject: Harness = harness();
    await startSession(subject, 1);
    subject.client.receiveAudio(encodeAudioFrame(1, CHUNK));
    subject.client.receiveText(JSON.stringify({ type: 'finish', id: 2, session: 1 }));
    await vi.advanceTimersByTimeAsync(LIMITS.maxSessionMs);
    expect(subject.engine.steps).not.toContain('cancel 1');
  });

  it('ends a session that runs past the cap even while audio keeps coming', async () => {
    const subject: Harness = harness();
    await startSession(subject, 1);
    for (let elapsed: number = 0; elapsed < LIMITS.maxSessionMs; elapsed += LIMITS.audioIdleMs / 2) {
      subject.client.receiveAudio(encodeAudioFrame(1, CHUNK));
      await vi.advanceTimersByTimeAsync(LIMITS.audioIdleMs / 2);
    }
    expect(subject.engine.steps).toContain('cancel 1');
  });

  it('closes an idle socket, but never while a session streams', async () => {
    const idle: Harness = harness();
    await vi.advanceTimersByTimeAsync(LIMITS.connectionIdleMs);
    expect(idle.closes).toEqual([CLOSE_GOING_AWAY]);
    expect(idle.engine.steps).toEqual(['stop']);
    const busy: Harness = harness();
    await startSession(busy, 1);
    await vi.advanceTimersByTimeAsync(LIMITS.connectionIdleMs);
    expect(busy.closes).toEqual([]);
  });

  it('closes a voice stream that finished connecting after the browser left', async () => {
    const subject: Harness = harness();
    let release: () => void = (): void => undefined;
    subject.engine.beginGate = new Promise((resolve: () => void): void => {
      release = resolve;
    });
    subject.client.receiveText('{"type":"start","id":1}');
    subject.client.closed();
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(subject.engine.steps).toEqual(['stop', 'begin 1', 'stop']);
    expect(subject.replies).toEqual([]);
  });
});
