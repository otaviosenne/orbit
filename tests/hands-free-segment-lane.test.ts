import { describe, expect, it } from 'vitest';
import type { DictationStart, DictationTranscript, TranscriptionResult } from '../src/shared/types';
import type { LaneSegment, VoiceSessions } from '../src/renderer/sheet/hands-free/segment-lane';
import { SegmentLane } from '../src/renderer/sheet/hands-free/segment-lane';

// Records every call in order, like the main process receives them, and answers on demand.
class FakeSessions implements VoiceSessions {
  readonly calls: string[] = [];
  private lastSession: number = 0;
  private listener: (transcript: DictationTranscript) => void = (): void => undefined;
  private readonly finals: Map<number, (result: TranscriptionResult) => void> = new Map();

  prepareDictation(): void {
    this.calls.push('prepare');
  }

  startDictation(): Promise<DictationStart> {
    const session: number = ++this.lastSession;
    this.calls.push(`start ${session}`);
    return Promise.resolve({ session, error: null });
  }

  feedDictation(session: number, pcm: Uint8Array): void {
    this.calls.push(`feed ${session}:${pcm[0] ?? -1}`);
  }

  finishDictation(session: number): Promise<TranscriptionResult> {
    this.calls.push(`finish ${session}`);
    return new Promise((resolve: (result: TranscriptionResult) => void): void => void this.finals.set(session, resolve));
  }

  onDictationTranscript(listener: (transcript: DictationTranscript) => void): void {
    this.listener = listener;
  }

  say(session: number, text: string): void {
    this.listener({ session, text });
  }

  settle(session: number, text: string): void {
    this.finals.get(session)?.({ ok: true, text, error: null });
  }
}

interface Heard {
  readonly texts: string[];
  readonly finals: string[];
  readonly failures: string[];
}

function makeLane(): { lane: SegmentLane; sessions: FakeSessions; heard: Heard } {
  const sessions: FakeSessions = new FakeSessions();
  const heard: Heard = { texts: [], finals: [], failures: [] };
  const lane: SegmentLane = new SegmentLane(sessions, {
    onText: (segment: LaneSegment, text: string): void => void heard.texts.push(`${segment.id}:${text}`),
    onFinal: (segment: LaneSegment, result: TranscriptionResult): void => void heard.finals.push(`${segment.id}:${result.text}`),
    onFailure: (message: string): void => void heard.failures.push(message),
  });
  return { lane, sessions, heard };
}

const chunk = (marker: number): Uint8Array => new Uint8Array([marker]);
const settled = (): Promise<void> => new Promise((resolve: () => void): void => void setTimeout(resolve, 0));

describe('SegmentLane', () => {
  it('holds audio until the session exists, then sends it in order', async () => {
    const { lane, sessions } = makeLane();
    lane.next();
    lane.feed(chunk(1));
    lane.feed(chunk(2));
    await settled();
    lane.feed(chunk(3));
    expect(sessions.calls).toEqual(['start 1', 'feed 1:1', 'feed 1:2', 'prepare', 'feed 1:3']);
  });

  it('asks the old session to finish before the next one starts, losing no audio between them', async () => {
    const { lane, sessions } = makeLane();
    lane.next();
    lane.feed(chunk(1));
    await settled();
    lane.next();
    lane.feed(chunk(2));
    await settled();
    lane.feed(chunk(3));
    expect(sessions.calls).toEqual(['start 1', 'feed 1:1', 'prepare', 'finish 1', 'start 2', 'feed 2:2', 'prepare', 'feed 2:3']);
  });

  it('opens rapid cuts one after another, each finished only after it opened', async () => {
    const { lane, sessions } = makeLane();
    lane.next();
    lane.feed(chunk(1));
    lane.next();
    lane.feed(chunk(2));
    lane.next();
    await settled();
    expect(sessions.calls.filter((call: string) => !call.startsWith('prepare'))).toEqual([
      'start 1', 'feed 1:1', 'finish 1', 'start 2', 'feed 2:2', 'finish 2', 'start 3',
    ]);
  });

  it('routes late words and the final text to the segment they belong to', async () => {
    const { lane, sessions, heard } = makeLane();
    const first: LaneSegment = lane.next();
    await settled();
    lane.next();
    await settled();
    sessions.say(1, 'still refining');
    sessions.say(2, 'new words');
    sessions.settle(1, 'still refining it');
    await settled();
    expect(first.session).toBe(1);
    expect(heard.texts).toEqual(['1:still refining', '2:new words']);
    expect(heard.finals).toEqual(['1:still refining it']);
    sessions.say(1, 'too late');
    expect(heard.texts).toHaveLength(2);
  });

  it('ends by finishing the last segment and stops taking audio', async () => {
    const { lane, sessions, heard } = makeLane();
    lane.next();
    await settled();
    const ended: Promise<void> = lane.end();
    lane.feed(chunk(9));
    await settled();
    sessions.settle(1, 'done');
    await ended;
    expect(heard.finals).toEqual(['1:done']);
    expect(sessions.calls).not.toContain('feed 1:9');
    expect(lane.active).toBeNull();
  });

  it('reports a session that could not start', async () => {
    const { lane, sessions, heard } = makeLane();
    sessions.startDictation = (): Promise<DictationStart> => Promise.resolve({ session: 1, error: 'no login' });
    lane.next();
    await settled();
    expect(heard.failures).toEqual(['no login']);
  });
});
