import { describe, expect, it } from 'vitest';
import type { TimelineLane } from '../src/renderer/views/timeline-lanes';
import { linesLaneOrder } from '../src/renderer/views/timeline-lines/lines-order';
import type { AgentSnapshot, AgentState, ChatSnapshot, ClosedChatActivity, TimeSpan } from '../src/shared/types';

const MINUTE: number = 60_000;
const NOW: number = Date.parse('2026-10-20T12:00:00Z');
const SPAN: TimeSpan = { start: NOW - 60 * MINUTE, end: NOW };

function agent(state: AgentState, startedMinutesAgo: number, lastActivityMinutesAgo: number = 0): AgentSnapshot {
  const lastActivityAt: number = NOW - lastActivityMinutesAgo * MINUTE;
  return { id: `${state}-${startedMinutesAgo}`, description: '', agentType: 'Explore', state, startedAt: NOW - startedMinutesAgo * MINUTE, lastActivityAt, endedAt: state === 'done' ? lastActivityAt : null };
}

function open(name: string, agents: AgentSnapshot[], statusMinutesAgo: number = 30): TimelineLane {
  const chat: ChatSnapshot = {
    sessionId: name,
    pid: 1,
    name,
    color: null,
    repository: { name: 'repo', root: '/repo' },
    cwd: '/repo',
    startedAt: NOW - 120 * MINUTE,
    status: 'idle',
    statusSince: NOW - statusMinutesAgo * MINUTE,
    agents,
    shells: [],
    isFocused: false,
  };
  return { kind: 'open', chat };
}

function closed(sessionId: string, lastActivityMinutesAgo: number): TimelineLane {
  const chat: ClosedChatActivity = {
    sessionId,
    title: sessionId,
    repository: { name: 'repo', root: '/repo' },
    color: null,
    lastActivityAt: NOW - lastActivityMinutesAgo * MINUTE,
    turns: [],
    agents: [],
  };
  return { kind: 'closed', chat };
}

function order(lanes: TimelineLane[]): string[] {
  return linesLaneOrder(lanes, SPAN).map((lane: TimelineLane) => lane.chat.sessionId);
}

describe('linesLaneOrder', () => {
  it('puts the chats running the most agents first', () => {
    const lanes: TimelineLane[] = [
      open('one', [agent('running', 5)]),
      open('three', [agent('running', 5), agent('running', 4), agent('running', 3)]),
      open('two', [agent('running', 5), agent('running', 4), agent('done', 30, 20)]),
    ];
    expect(order(lanes)).toEqual(['three', 'two', 'one']);
  });

  it('breaks equal running counts by name, never by activity that changes every poll', () => {
    const lanes: TimelineLane[] = [open('beta', [agent('running', 5)], 1), open('alpha', [agent('running', 5)], 50)];
    expect(order(lanes)).toEqual(['alpha', 'beta']);
  });

  it('puts chats with earlier agents before chats with none, each by most recent activity', () => {
    const lanes: TimelineLane[] = [
      open('no-agents-recent', [], 1),
      open('had-agents-older', [agent('done', 40, 35)], 30),
      open('running', [agent('running', 5)]),
      open('had-agents-recent', [agent('quiet', 10, 4)], 30),
      open('no-agents-older', [], 20),
    ];
    expect(order(lanes)).toEqual(['running', 'had-agents-recent', 'had-agents-older', 'no-agents-recent', 'no-agents-older']);
  });

  it('counts agents that finished before the window as none', () => {
    const lanes: TimelineLane[] = [open('ancient', [agent('done', 120, 90)], 25), open('fresh', [], 5)];
    expect(order(lanes)).toEqual(['fresh', 'ancient']);
  });

  it('keeps closed chats after the open ones, newest first', () => {
    const lanes: TimelineLane[] = [closed('closed-old', 50), open('idle', []), closed('closed-new', 10)];
    expect(order(lanes)).toEqual(['idle', 'closed-new', 'closed-old']);
  });
});
