import { beforeEach, describe, expect, it } from 'vitest';
import { CLOSE_GRACE_MS } from '../src/renderer/board/closing-chats';
import { PinnedChats } from '../src/renderer/board/pinned-chats';
import { PinnedInfoStore } from '../src/renderer/board/pinned-info';
import { ClosedChats, type LeftOpenChat } from '../src/renderer/suspend/closed-chats';
import { SuspendedChats } from '../src/renderer/suspend/suspended-chats';
import type { ChatSnapshot } from '../src/shared/types';

const SUSPENDED_AT: number = 5_000_000;
const RUN: number = 1_000_000;
const NEW_RUN: number = 6_000_000;
const WITHIN_GRACE: number = SUSPENDED_AT + CLOSE_GRACE_MS;
const PAST_GRACE: number = WITHIN_GRACE + 1;

function chat(sessionId: string, startedAt: number, name: string = sessionId): ChatSnapshot {
  return {
    sessionId, pid: 7, name, color: 'blue', repository: { name: 'acme', root: '/code/acme' }, cwd: '/code/acme', startedAt,
    status: 'idle', statusSince: startedAt, agents: [], shells: [], lastReplyAt: 4_000_000, isFocused: false, approval: null, localCi: null,
  };
}

function ids(chats: readonly ChatSnapshot[]): string[] {
  return chats.map((candidate: ChatSnapshot) => candidate.sessionId);
}

describe('SuspendedChats', () => {
  let stored: Map<string, string>;

  beforeEach(() => {
    stored = new Map();
    globalThis.localStorage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    } as unknown as Storage;
  });

  it('remembers a suspended chat as a read-only stand-in with its name, color and repository', () => {
    new SuspendedChats().add(chat('a', RUN, 'Alpha'), SUSPENDED_AT);
    const stand: ChatSnapshot | null = new SuspendedChats().closedSnapshot('a');
    expect(stand).toMatchObject({ sessionId: 'a', pid: 0, name: 'Alpha', color: 'blue', cwd: '/code/acme', repository: { name: 'acme' } });
  });

  it('lists the most recently suspended first and keeps one card per chat', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('a', RUN), SUSPENDED_AT);
    store.add(chat('b', RUN), SUSPENDED_AT + 1);
    store.add(chat('a', RUN), SUSPENDED_AT + 2);
    expect(ids(store.snapshots())).toEqual(['a', 'b']);
  });

  it('hides the suspended run while its process is still closing, so it shows only in Suspended', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('a', RUN), SUSPENDED_AT);
    const polled: ChatSnapshot[] = [chat('a', RUN), chat('b', RUN)];
    store.settle(polled, WITHIN_GRACE);
    expect(store.has('a')).toBe(true);
    expect(ids(store.visible(polled))).toEqual(['b']);
  });

  it('gives a chat back to the board when its close never took, like a failed Close', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('a', RUN), SUSPENDED_AT);
    const polled: ChatSnapshot[] = [chat('a', RUN)];
    store.settle(polled, PAST_GRACE);
    expect(store.has('a')).toBe(false);
    expect(ids(store.visible(polled))).toEqual(['a']);
  });

  it('keeps a suspended chat whose process is gone, however long ago it was suspended', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('a', RUN), SUSPENDED_AT);
    store.settle([], PAST_GRACE);
    expect(store.has('a')).toBe(true);
  });

  it('lets a chat leave Suspended once it is open again in a new run, by whatever path', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('a', RUN), SUSPENDED_AT);
    const reopened: ChatSnapshot[] = [chat('a', NEW_RUN)];
    store.settle(reopened, WITHIN_GRACE);
    expect(store.has('a')).toBe(false);
    expect(ids(store.visible(reopened))).toEqual(['a']);
    expect(new SuspendedChats().has('a')).toBe(false);
  });

  it('leaves suspended chats out of the pin order the Pinned row and its keys use', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('b', RUN), SUSPENDED_AT);
    expect(store.withoutSuspended(['a', 'b', 'c'])).toEqual(['a', 'c']);
  });

  it('can be taken out of Suspended without reopening', () => {
    const store: SuspendedChats = new SuspendedChats();
    store.add(chat('a', RUN), SUSPENDED_AT);
    store.remove('a');
    expect(store.snapshots()).toEqual([]);
  });

  it('skips stored entries it cannot read', () => {
    stored.set('orbit.suspended', JSON.stringify([{ sessionId: 'x' }, 'junk']));
    expect(new SuspendedChats().snapshots()).toEqual([]);
    stored.set('orbit.suspended', '{not json');
    expect(new SuspendedChats().snapshots()).toEqual([]);
  });
});

describe('ClosedChats', () => {
  beforeEach(() => {
    const stored: Map<string, string> = new Map();
    globalThis.localStorage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    } as unknown as Storage;
  });

  function setUp(open: ChatSnapshot[], left: LeftOpenChat[] = []): { closed: ClosedChats; pins: PinnedChats; info: PinnedInfoStore; suspended: SuspendedChats } {
    const pins: PinnedChats = new PinnedChats();
    const info: PinnedInfoStore = new PinnedInfoStore();
    const suspended: SuspendedChats = new SuspendedChats();
    return { closed: new ClosedChats(pins, info, suspended, (): readonly ChatSnapshot[] => open, (): readonly LeftOpenChat[] => left), pins, info, suspended };
  }

  it('lists a chat left open by a shutdown in its column, unless it is open, pinned or suspended', () => {
    const left: LeftOpenChat[] = ['a', 'b', 'c', 'd'].map((id: string): LeftOpenChat => ({ chat: chat(id, 0), column: 'busy' }));
    const { closed, pins, suspended } = setUp([chat('a', 1)], left);
    pins.toggle('b');
    suspended.add(chat('c', 1), 5);
    expect(closed.leftOpen().map((entry) => entry.chat.sessionId)).toEqual(['d']);
    expect(closed.find('d')?.kind).toBe('left-open');
  });

  it('keeps a pinned chat that is also suspended in Pinned, labelled Suspended', () => {
    const { closed, pins, info, suspended } = setUp([]);
    pins.pin('a');
    pins.pin('b');
    info.remember([chat('a', RUN), chat('b', RUN)]);
    suspended.add(chat('a', RUN), SUSPENDED_AT);
    expect(ids(closed.pinned())).toEqual(['a', 'b']);
    expect(closed.find('a')?.kind).toBe('suspended');
    expect(closed.find('b')?.kind).toBe('closed-pin');
    expect(pins.has('a')).toBe(true);
  });

  it('finds nothing closed for a chat that is open', () => {
    const { closed, suspended } = setUp([chat('a', NEW_RUN)]);
    suspended.add(chat('a', RUN), SUSPENDED_AT);
    expect(closed.find('a')).toBeUndefined();
  });
});
