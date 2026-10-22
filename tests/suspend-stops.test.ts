import { describe, expect, it } from 'vitest';
import { suspendStops, suspendWarning } from '../src/renderer/suspend/suspend-stops';
import type { AgentSnapshot, AgentState, ChatSnapshot, ChatStatus, ShellSnapshot, ShellStatus } from '../src/shared/types';

function agent(state: AgentState): AgentSnapshot {
  return { id: state, description: 'd', agentType: 't', state, startedAt: 0, lastActivityAt: 0, endedAt: null };
}

function shell(status: ShellStatus): ShellSnapshot {
  return { id: status, command: 'c', description: null, startedAt: 0, status, endedAt: null, exitCode: null };
}

function chat(status: ChatStatus, agents: AgentSnapshot[] = [], shells: ShellSnapshot[] = []): ChatSnapshot {
  return {
    sessionId: 's', pid: 7, name: 'n', color: null, repository: { name: 'r', root: '/r' }, cwd: '/r', startedAt: 0,
    status, statusSince: 0, agents, shells, lastReplyAt: null, isFocused: false,
  };
}

describe('suspendWarning', () => {
  it('needs no confirmation for a quiet chat, or one waiting on you', () => {
    expect(suspendWarning(suspendStops(chat('idle', [agent('done')], [shell('completed')])))).toBeNull();
    expect(suspendWarning(suspendStops(chat('waiting')))).toBeNull();
  });

  it('says it stops the current turn of a working chat', () => {
    expect(suspendWarning(suspendStops(chat('busy')))).toBe('Stops its current turn.');
  });

  it('counts running and quiet agents and running shells only', () => {
    const busy: ChatSnapshot = chat('busy', [agent('running'), agent('quiet'), agent('done')], [shell('running'), shell('killed')]);
    expect(suspendStops(busy)).toEqual({ isWorking: true, agents: 2, shells: 1 });
    expect(suspendWarning(suspendStops(busy))).toBe('Stops its current turn, 2 running agents and 1 background shell.');
  });

  it('warns about background work even when the chat itself is idle', () => {
    expect(suspendWarning(suspendStops(chat('idle', [], [shell('running'), shell('running')])))).toBe('Stops 2 background shells.');
  });
});
