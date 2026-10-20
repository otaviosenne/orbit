import { describe, expect, it } from 'vitest';
import type { CountStep } from '../src/renderer/views/timeline-lines/agent-count-series';
import { agentCountSeries, agentRunEnd, peakCount, runningAgentCount } from '../src/renderer/views/timeline-lines/agent-count-series';
import type { AgentSnapshot, AgentState, TimeSpan } from '../src/shared/types';

const MINUTE: number = 60_000;
const NOW: number = Date.parse('2026-10-20T12:00:00Z');
const SPAN: TimeSpan = { start: NOW - 60 * MINUTE, end: NOW };

function agent(id: string, state: AgentState, startedMinutesAgo: number, lastActivityMinutesAgo: number, endedMinutesAgo: number | null = null): AgentSnapshot {
  return {
    id,
    description: id,
    agentType: 'Explore',
    state,
    startedAt: NOW - startedMinutesAgo * MINUTE,
    lastActivityAt: NOW - lastActivityMinutesAgo * MINUTE,
    endedAt: endedMinutesAgo === null ? null : NOW - endedMinutesAgo * MINUTE,
  };
}

// Each step as [minutes ago it started, minutes ago it ended, running ids].
function shape(steps: readonly CountStep[]): [number, number, string[]][] {
  return steps.map((step: CountStep) => [(NOW - step.start) / MINUTE, (NOW - step.end) / MINUTE, step.agents.map((running: AgentSnapshot) => running.id)]);
}

describe('agentRunEnd', () => {
  it('ends a running agent now, a quiet one at its last output and a finished one when it ended', () => {
    expect(agentRunEnd(agent('a', 'running', 10, 0), NOW)).toBe(NOW);
    expect(agentRunEnd(agent('b', 'quiet', 10, 4), NOW)).toBe(NOW - 4 * MINUTE);
    expect(agentRunEnd(agent('c', 'done', 10, 6, 5), NOW)).toBe(NOW - 5 * MINUTE);
  });

  it('falls back to the last output for a finished agent without an end time', () => {
    expect(agentRunEnd(agent('c', 'done', 10, 6), NOW)).toBe(NOW - 6 * MINUTE);
  });
});

describe('agentCountSeries', () => {
  it('is one flat zero step when the chat ran no agents', () => {
    expect(shape(agentCountSeries([], SPAN, NOW))).toEqual([[60, 0, []]]);
  });

  it('rises and falls with overlapping agents', () => {
    const agents: AgentSnapshot[] = [agent('a', 'done', 30, 10, 10), agent('b', 'running', 20, 0)];
    expect(shape(agentCountSeries(agents, SPAN, NOW))).toEqual([
      [60, 30, []],
      [30, 20, ['a']],
      [20, 10, ['a', 'b']],
      [10, 0, ['b']],
    ]);
  });

  it('clips agents to the window and drops those entirely before it', () => {
    const agents: AgentSnapshot[] = [agent('old', 'done', 120, 70, 70), agent('straddling', 'done', 90, 50, 50)];
    expect(shape(agentCountSeries(agents, SPAN, NOW))).toEqual([
      [60, 50, ['straddling']],
      [50, 0, []],
    ]);
  });

  it('stops counting a quiet agent at its last output', () => {
    expect(shape(agentCountSeries([agent('q', 'quiet', 8, 4)], SPAN, NOW))).toEqual([
      [60, 8, []],
      [8, 4, ['q']],
      [4, 0, []],
    ]);
  });

  it('makes one step when agents start or stop at the same moment', () => {
    const agents: AgentSnapshot[] = [agent('a', 'done', 20, 10, 10), agent('b', 'done', 20, 10, 10), agent('c', 'running', 10, 0)];
    expect(shape(agentCountSeries(agents, SPAN, NOW))).toEqual([
      [60, 20, []],
      [20, 10, ['a', 'b']],
      [10, 0, ['c']],
    ]);
  });

  it('is empty for an empty span', () => {
    expect(agentCountSeries([agent('a', 'running', 5, 0)], { start: NOW, end: NOW }, NOW)).toEqual([]);
  });

  it('reports the peak and the number running now', () => {
    const agents: AgentSnapshot[] = [agent('a', 'done', 30, 10, 10), agent('b', 'running', 20, 0), agent('q', 'quiet', 12, 4)];
    expect(peakCount(agentCountSeries(agents, SPAN, NOW))).toBe(3);
    expect(runningAgentCount(agents)).toBe(1);
  });
});
