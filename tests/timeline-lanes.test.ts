import { describe, expect, it } from 'vitest';
import type { TimelineLane } from '../src/renderer/views/timeline-lanes';
import { timelineLanes } from '../src/renderer/views/timeline-lanes';
import type { AgentSnapshot, ChatSnapshot, ClosedChatActivity, TimeSpan } from '../src/shared/types';

const MINUTE: number = 60_000;
const NOW: number = Date.parse('2026-10-20T12:00:00Z');
const WINDOW: TimeSpan = { start: NOW - 60 * MINUTE, end: NOW };

function open(sessionId: string, repository: string, name: string = sessionId): ChatSnapshot {
  return {
    sessionId,
    pid: 1,
    name,
    color: null,
    repository: { name: repository, root: `/${repository}` },
    cwd: `/${repository}`,
    startedAt: NOW,
    status: 'idle',
    statusSince: NOW,
    agents: [],
    shells: [],
    isFocused: false,
  };
}

function closed(sessionId: string, repository: string, lastActivityMinutesAgo: number, turns: TimeSpan[], agents: AgentSnapshot[] = []): ClosedChatActivity {
  return {
    sessionId,
    title: sessionId,
    repository: { name: repository, root: `/${repository}` },
    color: null,
    lastActivityAt: NOW - lastActivityMinutesAgo * MINUTE,
    turns,
    agents,
  };
}

function minutesAgo(from: number, to: number): TimeSpan {
  return { start: NOW - from * MINUTE, end: NOW - to * MINUTE };
}

function ids(lanes: readonly TimelineLane[]): string[] {
  return lanes.map((lane: TimelineLane) => `${lane.kind}:${lane.chat.sessionId}`);
}

describe('timelineLanes', () => {
  it('lists open lanes by repository first, then closed lanes by repository and recency', () => {
    const lanes: TimelineLane[] = timelineLanes(
      [open('o-web', 'web'), open('o-api', 'api')],
      [closed('c-web', 'web', 5, [minutesAgo(10, 5)]), closed('c-api-old', 'api', 30, [minutesAgo(40, 30)]), closed('c-api-new', 'api', 2, [minutesAgo(5, 2)])],
      WINDOW,
    );
    expect(ids(lanes)).toEqual(['open:o-api', 'open:o-web', 'closed:c-api-new', 'closed:c-api-old', 'closed:c-web']);
  });

  it('shows a chat that is open again only as an open lane', () => {
    const lanes: TimelineLane[] = timelineLanes([open('same', 'api')], [closed('same', 'api', 1, [minutesAgo(5, 1)])], WINDOW);
    expect(ids(lanes)).toEqual(['open:same']);
  });

  it('clips closed turns to the window and drops lanes left with nothing to draw', () => {
    const lanes: TimelineLane[] = timelineLanes([], [closed('crossing', 'api', 50, [minutesAgo(90, 50)]), closed('gone', 'api', 70, [minutesAgo(80, 70)])], WINDOW);
    expect(ids(lanes)).toEqual(['closed:crossing']);
    expect(lanes[0]?.kind === 'closed' && lanes[0].chat.turns).toEqual([minutesAgo(60, 50)]);
  });

  it('keeps a closed lane whose only activity in the window is an agent', () => {
    const agent: AgentSnapshot = {
      id: 'a1',
      description: 'Explore',
      agentType: 'Explore',
      state: 'done',
      startedAt: NOW - 20 * MINUTE,
      lastActivityAt: NOW - 10 * MINUTE,
      endedAt: NOW - 10 * MINUTE,
    };
    const lanes: TimelineLane[] = timelineLanes([], [closed('agents-only', 'api', 10, [minutesAgo(90, 80)], [agent])], WINDOW);
    expect(ids(lanes)).toEqual(['closed:agents-only']);
  });
});
