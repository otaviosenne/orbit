import { describe, expect, it } from 'vitest';
import type { OlderHistory } from '../src/renderer/sheet/paging/older-history';
import { searchOlder } from '../src/renderer/sheet/paging/older-history';

// Pages of a thread, newest first; each load reveals one more. `mine` marks the pages holding one of your messages.
interface FakeThread {
  readonly history: OlderHistory;
  readonly find: () => number | null;
  readonly loads: () => number;
}

function history(pages: number, mine: ReadonlySet<number>): FakeThread {
  let shown: number = 1;
  let loads: number = 0;
  return {
    loads: (): number => loads,
    history: {
      get canLoadOlder(): boolean {
        return shown < pages;
      },
      loadOlder: async (): Promise<boolean> => {
        loads += 1;
        if (shown >= pages) return false;
        shown += 1;
        return true;
      },
    },
    find: (): number | null => [...Array(shown).keys()].find((page: number) => mine.has(page)) ?? null,
  };
}

describe('searchOlder', () => {
  it('finds a message already shown without loading anything', async () => {
    const thread: FakeThread = history(5, new Set([0]));
    expect(await searchOlder(thread.find, thread.history)).toBe(0);
    expect(thread.loads()).toBe(0);
  });

  it('loads older pages one by one until your message turns up', async () => {
    const thread: FakeThread = history(5, new Set([3]));
    expect(await searchOlder(thread.find, thread.history)).toBe(3);
    expect(thread.loads()).toBe(3);
  });

  it('stops at the start of the thread when you wrote nothing there', async () => {
    const thread: FakeThread = history(4, new Set());
    expect(await searchOlder(thread.find, thread.history)).toBeNull();
    expect(thread.loads()).toBe(3);
  });

  it('stops when a load adds nothing, such as the thread changing under it', async () => {
    const stuck: OlderHistory = { canLoadOlder: true, loadOlder: async (): Promise<boolean> => false };
    expect(await searchOlder((): null => null, stuck)).toBeNull();
  });
});
