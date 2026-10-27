import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPause } from '../src/renderer/pause/chat-pause';
import type { PauseApi } from '../src/renderer/pause/chat-pause';
import type { ChatSnapshot, PauseReport, PauseTarget } from '../src/shared/types';

let store: Map<string, string> = new Map();

function chat(sessionId: string, pid: number, status: ChatSnapshot['status']): ChatSnapshot {
  return {
    sessionId, pid, name: sessionId, color: 'blue', repository: { name: 'acme', root: '/code/acme' }, cwd: '/code/acme', startedAt: 1,
    status, statusSince: 1, agents: [], shells: [], lastReplyAt: 1, isFocused: false,
  };
}

function api(skipped: readonly number[] = []): PauseApi & { paused: PauseTarget[][]; continued: number[][] } {
  const calls: { paused: PauseTarget[][]; continued: number[][] } = { paused: [], continued: [] };
  const report = (pids: readonly number[]): PauseReport => ({ reached: pids.filter((pid: number) => !skipped.includes(pid)), skipped });
  return {
    ...calls,
    pauseChats: (targets: readonly PauseTarget[]): Promise<PauseReport> => {
      calls.paused.push([...targets]);
      return Promise.resolve(report(targets.map((target: PauseTarget) => target.pid)));
    },
    continueChats: (pids: readonly number[]): Promise<PauseReport> => {
      calls.continued.push([...pids]);
      return Promise.resolve(report(pids));
    },
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

describe('ChatPause', () => {
  it('pauses the working chats once and continues exactly those', async () => {
    const chats: ChatSnapshot[] = [chat('a', 1, 'busy'), chat('b', 2, 'idle')];
    const calls = api();
    const pause: ChatPause = new ChatPause(() => chats, calls);
    await pause.pauseAll();
    await pause.pauseAll();
    expect(calls.paused).toEqual([[{ pid: 1, interrupt: true }]]);
    expect(pause.pausedCount).toBe(1);
    await pause.continueAll();
    expect(calls.continued).toEqual([[1]]);
    expect(pause.pausedCount).toBe(0);
  });

  it('does not count a chat it could not reach as paused', async () => {
    const pause: ChatPause = new ChatPause(() => [chat('a', 1, 'busy')], api([1]));
    await pause.pauseAll();
    expect(pause.pausedCount).toBe(0);
  });

  it('keeps a paused chat across a restart and continues it once it is open again', async () => {
    const calls = api();
    await new ChatPause(() => [chat('a', 1, 'busy')], calls).pauseAll();
    const restarted: ChatPause = new ChatPause(() => [], calls);
    expect(restarted.pausedCount).toBe(0);
    const reopened: ChatPause = new ChatPause(() => [chat('a', 9, 'idle')], calls);
    expect(reopened.pausedCount).toBe(1);
    await reopened.continueAll();
    expect(calls.continued).toEqual([[9]]);
  });

  it('forgets paused chats nothing can bring back', async () => {
    const pause: ChatPause = new ChatPause(() => [chat('a', 1, 'busy')], api());
    await pause.pauseAll();
    pause.prune(new Set());
    expect(new ChatPause(() => [chat('a', 1, 'idle')], api()).pausedCount).toBe(0);
  });
});
