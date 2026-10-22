import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FORGET_AFTER_MISSING_MS, OpenChatsMemory } from '../src/renderer/restore/open-chats-memory';
import type { ChatSnapshot } from '../src/shared/types';

const NOW: number = 1_000_000;
const columnOf = (): 'busy' => 'busy';
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
    new OpenChatsMemory().observe([chat('a'), chat('b')], columnOf, NOW);
    expect(new OpenChatsMemory().closed([]).map((remembered) => remembered.sessionId)).toEqual(['a', 'b']);
  });

  it('lists only the remembered chats that are not open', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a'), chat('b')], columnOf, NOW);
    expect(memory.closed([chat('a')]).map((remembered) => remembered.sessionId)).toEqual(['b']);
  });

  it('forgets a chat that stayed gone while watched, but not one that vanished with the machine', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a')], columnOf, NOW);
    memory.observe([], columnOf, NOW + 1);
    memory.observe([], columnOf, NOW + FORGET_AFTER_MISSING_MS + 2);
    expect(new OpenChatsMemory().closed([])).toEqual([]);

    memory.observe([chat('b')], columnOf, NOW);
    const restarted: OpenChatsMemory = new OpenChatsMemory();
    restarted.observe([], columnOf, NOW + FORGET_AFTER_MISSING_MS * 10);
    expect(restarted.closed([]).map((remembered) => remembered.sessionId)).toEqual(['b']);
  });

  it('forgets a chat closed on purpose', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a')], columnOf, NOW);
    memory.forget('a');
    expect(new OpenChatsMemory().closed([])).toEqual([]);
  });
});

describe('OpenChatsMemory columns', () => {
  it('keeps the column a chat was in, with how its card looked', () => {
    new OpenChatsMemory().observe([chat('a')], (): 'needs' => 'needs', NOW);
    const [remembered] = new OpenChatsMemory().closed([]);
    expect(remembered.column).toBe('needs');
    expect(remembered.info.name).toBe('chat a');
  });

  it('follows the chat when it moves to another column', () => {
    const memory: OpenChatsMemory = new OpenChatsMemory();
    memory.observe([chat('a')], (): 'busy' => 'busy', NOW);
    memory.observe([chat('a')], (): 'idle' => 'idle', NOW + 1);
    expect(new OpenChatsMemory().closed([])[0].column).toBe('idle');
  });
});
