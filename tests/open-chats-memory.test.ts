import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FORGET_AFTER_MISSING_MS, OpenChatsMemory } from '../src/renderer/restore/open-chats-memory';
import { RESTORE_DELAY_MS, restoreOpenChats } from '../src/renderer/restore/startup-restore';
import type { ChatSnapshot } from '../src/shared/types';

const NOW: number = 1_000_000;
let store: Map<string, string> = new Map();

function chat(sessionId: string): ChatSnapshot {
  return {
    sessionId, pid: 7, name: `chat ${sessionId}`, color: 'blue', repository: { name: 'acme', root: '/code/acme' }, cwd: '/code/acme', startedAt: 1,
    status: 'idle', statusSince: 1, agents: [], shells: [], lastReplyAt: 1, isFocused: false,
  };
}

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => void store.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenChatsMemory', () => {
  it('remembers open chats across a restart', () => {
    new OpenChatsMemory().observe([chat('a'), chat('b')], NOW);
    expect(new OpenChatsMemory().closed([]).map((remembered) => remembered.sessionId)).toEqual(['a', 'b']);
  });

  it('lists only the remembered chats that are not open', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a'), chat('b')], NOW);
    expect(memory.closed([chat('a')]).map((remembered) => remembered.sessionId)).toEqual(['b']);
  });

  it('forgets a chat that stayed gone while watched, but not one that vanished with the machine', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a')], NOW);
    memory.observe([], NOW + 1);
    memory.observe([], NOW + FORGET_AFTER_MISSING_MS + 2);
    expect(new OpenChatsMemory().closed([])).toEqual([]);

    memory.observe([chat('b')], NOW);
    const restarted: OpenChatsMemory = new OpenChatsMemory();
    restarted.observe([], NOW + FORGET_AFTER_MISSING_MS * 10);
    expect(restarted.closed([]).map((remembered) => remembered.sessionId)).toEqual(['b']);
  });

  it('forgets a chat closed on purpose', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a')], NOW);
    memory.forget('a');
    expect(new OpenChatsMemory().closed([])).toEqual([]);
  });
});

describe('restoreOpenChats', () => {
  it('reopens the missing chats once, skipping suspended and already-open ones', async () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a'), chat('b'), chat('c'), chat('d')], NOW);
    const reopened: string[] = [];
    const waits: number[] = [];
    await restoreOpenChats({
      memory,
      livePoll: async () => [chat('a')],
      isSuspended: (sessionId: string): boolean => sessionId === 'c',
      reopen: async (remembered): Promise<boolean> => { reopened.push(remembered.sessionId); return true; },
      pause: async (ms: number): Promise<void> => void waits.push(ms),
    });
    expect(reopened).toEqual(['b', 'd']);
    expect(waits[0]).toBe(RESTORE_DELAY_MS);
  });

  it('forgets a chat that could not be reopened', async () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a')], NOW);
    await restoreOpenChats({ memory, livePoll: async () => [], isSuspended: () => false, reopen: async () => false, pause: async () => undefined });
    expect(new OpenChatsMemory().closed([])).toEqual([]);
  });
});
