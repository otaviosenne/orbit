import { describe, expect, it } from 'vitest';
import { NeedsYouWatch } from '../src/renderer/needs-you-watch';
import type { ChatSnapshot } from '../src/shared/types';

function chat(sessionId: string): ChatSnapshot {
  return { sessionId, name: sessionId } as unknown as ChatSnapshot;
}

describe('NeedsYouWatch', () => {
  it('announces nothing on the first look', () => {
    expect(new NeedsYouWatch().arrivals([chat('a'), chat('b')])).toEqual([]);
  });

  it('announces only chats that came in since the last look', () => {
    const watch: NeedsYouWatch = new NeedsYouWatch();
    watch.arrivals([chat('a')]);
    expect(watch.arrivals([chat('a'), chat('b')]).map((c) => c.sessionId)).toEqual(['b']);
    expect(watch.arrivals([chat('a'), chat('b')])).toEqual([]);
  });

  it('announces a chat again when it leaves and comes back', () => {
    const watch: NeedsYouWatch = new NeedsYouWatch();
    watch.arrivals([chat('a')]);
    watch.arrivals([]);
    expect(watch.arrivals([chat('a')]).map((c) => c.sessionId)).toEqual(['a']);
  });
});
