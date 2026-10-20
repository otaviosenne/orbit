import { describe, expect, it } from 'vitest';
import type { AgentSnapshot } from '../src/shared/types';
import { PendingStops, STOP_GRACE_MS } from '../src/renderer/sheet/pending-stops';

const REQUESTED_AT: number = 1_000_000;

function agent(id: string, lastActivityAt: number): AgentSnapshot {
  return { id, description: id, agentType: 'general-purpose', state: 'running', startedAt: 0, lastActivityAt, endedAt: null };
}

function visibleIds(stops: PendingStops, agents: readonly AgentSnapshot[], now: number): string[] {
  return stops.visible(agents, now).map((candidate: AgentSnapshot) => candidate.id);
}

describe('PendingStops', () => {
  it('hides only the agent being stopped', () => {
    const stops: PendingStops = new PendingStops();
    stops.hide('a', REQUESTED_AT);
    expect(visibleIds(stops, [agent('a', REQUESTED_AT), agent('b', REQUESTED_AT)], REQUESTED_AT + 1)).toEqual(['b']);
  });

  it('shows the agent again when the stop failed', () => {
    const stops: PendingStops = new PendingStops();
    stops.hide('a', REQUESTED_AT);
    stops.restore('a');
    expect(visibleIds(stops, [agent('a', REQUESTED_AT)], REQUESTED_AT + 1)).toEqual(['a']);
  });

  it('keeps it hidden through the grace period even while it still writes', () => {
    const stops: PendingStops = new PendingStops();
    stops.hide('a', REQUESTED_AT);
    expect(visibleIds(stops, [agent('a', REQUESTED_AT + 1)], REQUESTED_AT + STOP_GRACE_MS - 1)).toEqual([]);
  });

  it('brings it back once it is still writing after the grace period', () => {
    const stops: PendingStops = new PendingStops();
    stops.hide('a', REQUESTED_AT);
    expect(visibleIds(stops, [agent('a', REQUESTED_AT + 1)], REQUESTED_AT + STOP_GRACE_MS)).toEqual(['a']);
  });

  it('keeps a silent agent hidden past the grace period', () => {
    const stops: PendingStops = new PendingStops();
    stops.hide('a', REQUESTED_AT);
    expect(visibleIds(stops, [agent('a', REQUESTED_AT)], REQUESTED_AT + STOP_GRACE_MS)).toEqual([]);
  });
});
