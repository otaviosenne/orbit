import { describe, expect, it } from 'vitest';
import { isMidWork, pauseTargets } from '../src/renderer/pause/pause-targets';
import type { AgentSnapshot, ChatSnapshot, ShellSnapshot } from '../src/shared/types';

function chat(sessionId: string, pid: number, status: ChatSnapshot['status'], extra: Partial<ChatSnapshot> = {}): ChatSnapshot {
  return {
    sessionId, pid, name: sessionId, color: 'blue', repository: { name: 'acme', root: '/code/acme' }, cwd: '/code/acme', startedAt: 1,
    status, statusSince: 1, agents: [], shells: [], lastReplyAt: 1, isFocused: false, approval: null, localCi: null, ...extra,
  };
}

const RUNNING_AGENT = { state: 'running' } as AgentSnapshot;
const RUNNING_SHELL = { status: 'running' } as ShellSnapshot;
const NONE: ReadonlySet<string> = new Set();

describe('pauseTargets', () => {
  it('interrupts a busy chat first', () => {
    expect(pauseTargets([chat('a', 1, 'busy')], NONE)).toEqual([{ pid: 1, interrupt: true }]);
  });

  it('only messages an idle chat that still runs an agent or a shell', () => {
    const chats: ChatSnapshot[] = [chat('a', 1, 'idle', { agents: [RUNNING_AGENT] }), chat('b', 2, 'shell', { shells: [RUNNING_SHELL] })];
    expect(pauseTargets(chats, NONE)).toEqual([{ pid: 1, interrupt: false }, { pid: 2, interrupt: false }]);
  });

  it('leaves quiet chats alone', () => {
    expect(pauseTargets([chat('a', 1, 'idle'), chat('b', 2, 'unknown')], NONE)).toEqual([]);
  });

  it('never types into a chat that waits on a question', () => {
    expect(pauseTargets([chat('a', 1, 'waiting', { agents: [RUNNING_AGENT] })], NONE)).toEqual([]);
  });

  it('skips chats already paused, so pausing twice sends nothing twice', () => {
    expect(pauseTargets([chat('a', 1, 'busy')], new Set(['a']))).toEqual([]);
  });
});

describe('isMidWork', () => {
  it('counts a turn or an agent, not a lone background shell', () => {
    expect(isMidWork(chat('a', 1, 'busy'))).toBe(true);
    expect(isMidWork(chat('a', 1, 'idle', { agents: [RUNNING_AGENT] }))).toBe(true);
    expect(isMidWork(chat('a', 1, 'shell', { shells: [RUNNING_SHELL] }))).toBe(false);
    expect(isMidWork(chat('a', 1, 'idle'))).toBe(false);
  });
});
