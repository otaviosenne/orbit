import { describe, expect, it } from 'vitest';
import { PagedTranscript } from '../src/renderer/sheet/paging/paged-transcript';
import type { PageFetch } from '../src/renderer/sheet/paging/paged-transcript';
import type { TranscriptItem } from '../src/shared/types';

const PAGE: number = 2;
const item = (id: string): TranscriptItem => ({ kind: 'notice', id, timestamp: 0, tone: 'info', title: id, detail: null });
const ids = (paged: PagedTranscript): string[] => paged.items.map((entry: TranscriptItem) => entry.id);

// Main's side: the last `limit` items of a transcript that can grow between calls.
interface FakeTranscript {
  readonly fetch: PageFetch;
  readonly limits: number[];
  readonly add: (id: string) => void;
}

function transcript(...initial: string[]): FakeTranscript {
  const all: TranscriptItem[] = initial.map(item);
  const limits: number[] = [];
  return {
    limits,
    add: (id: string): void => void all.push(item(id)),
    fetch: async (limit: number): Promise<TranscriptItem[]> => {
      limits.push(limit);
      return all.slice(-limit);
    },
  };
}

describe('PagedTranscript', () => {
  it('shows only the latest page at first and pages older items in on request', async () => {
    const source: FakeTranscript = transcript('a', 'b', 'c', 'd', 'e');
    const paged: PagedTranscript = new PagedTranscript(PAGE);
    await paged.refresh('chat', source.fetch);
    expect(ids(paged)).toEqual(['d', 'e']);
    expect(await paged.loadOlder()).toBe(true);
    expect(ids(paged)).toEqual(['b', 'c', 'd', 'e']);
    expect(await paged.loadOlder()).toBe(true);
    expect(ids(paged)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(paged.canLoadOlder).toBe(false);
    expect(await paged.loadOlder()).toBe(false);
    expect(source.limits).toEqual([2, 4, 6]);
  });

  it('keeps older pages while polls append, asking only for the latest page', async () => {
    const source: FakeTranscript = transcript('a', 'b', 'c', 'd');
    const paged: PagedTranscript = new PagedTranscript(PAGE);
    await paged.refresh('chat', source.fetch);
    await paged.loadOlder();
    source.add('e');
    await paged.refresh('chat', source.fetch);
    expect(ids(paged)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(source.limits.at(-1)).toBe(PAGE);
  });

  it('shares one request when scrolling and the message search ask for older items together', async () => {
    const source: FakeTranscript = transcript('a', 'b', 'c', 'd', 'e', 'f');
    const paged: PagedTranscript = new PagedTranscript(PAGE);
    await paged.refresh('chat', source.fetch);
    await Promise.all([paged.loadOlder(), paged.loadOlder()]);
    expect(ids(paged)).toEqual(['c', 'd', 'e', 'f']);
    expect(source.limits).toEqual([2, 4]);
  });

  it('starts over on another thread and drops answers meant for the one it left', async () => {
    const chat: FakeTranscript = transcript('a', 'b', 'c');
    const agent: FakeTranscript = transcript('x', 'y', 'z');
    const paged: PagedTranscript = new PagedTranscript(PAGE);
    await paged.refresh('chat', chat.fetch);
    const older: Promise<boolean> = paged.loadOlder();
    await paged.refresh('chat/agent', agent.fetch);
    expect(await older).toBe(false);
    expect(ids(paged)).toEqual(['y', 'z']);
  });

  it('ignores an answer that lands after it was cleared', async () => {
    const source: FakeTranscript = transcript('a', 'b', 'c');
    const paged: PagedTranscript = new PagedTranscript(PAGE);
    const refresh: Promise<boolean> = paged.refresh('chat', source.fetch);
    paged.clear();
    expect(await refresh).toBe(false);
    expect(paged.items).toEqual([]);
  });
});
