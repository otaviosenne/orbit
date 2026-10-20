import type { AgentSnapshot, TimeSpan } from '../../../shared/types';

// One stretch of time during which the same agents were running.
export interface CountStep {
  readonly start: number;
  readonly end: number;
  readonly agents: readonly AgentSnapshot[];
}

interface AgentRun {
  readonly agent: AgentSnapshot;
  readonly start: number;
  readonly end: number;
}

// A quiet agent stopped producing output at its last activity, so it no longer counts as running after it.
export function agentRunEnd(agent: AgentSnapshot, now: number): number {
  if (agent.state === 'running') return now;
  if (agent.state === 'quiet') return agent.lastActivityAt;
  return agent.endedAt ?? agent.lastActivityAt;
}

export function runningAgentCount(agents: readonly AgentSnapshot[]): number {
  return agents.filter((agent: AgentSnapshot) => agent.state === 'running').length;
}

// A step function over the span: each agent counts from its start up to (not including) its end.
export function agentCountSeries(agents: readonly AgentSnapshot[], span: TimeSpan, now: number): CountStep[] {
  if (span.end <= span.start) return [];
  const runs: AgentRun[] = agents
    .map((agent: AgentSnapshot) => clipRun(agent, span, now))
    .filter((run: AgentRun | null): run is AgentRun => run !== null);
  const bounds: number[] = boundaries(runs, span);
  return bounds.slice(0, -1).map((start: number, index: number): CountStep => ({
    start,
    end: bounds[index + 1] ?? span.end,
    agents: runs.filter((run: AgentRun) => run.start <= start && run.end > start).map((run: AgentRun) => run.agent),
  }));
}

export function peakCount(steps: readonly CountStep[]): number {
  return steps.reduce((peak: number, step: CountStep) => Math.max(peak, step.agents.length), 0);
}

function clipRun(agent: AgentSnapshot, span: TimeSpan, now: number): AgentRun | null {
  const start: number = Math.max(agent.startedAt, span.start);
  const end: number = Math.min(agentRunEnd(agent, now), span.end);
  return end > start ? { agent, start, end } : null;
}

// Every moment the count can change, once each, so agents starting or stopping together make one step, not a spike.
function boundaries(runs: readonly AgentRun[], span: TimeSpan): number[] {
  const times: Set<number> = new Set([span.start, span.end]);
  runs.forEach((run: AgentRun): void => {
    times.add(run.start);
    times.add(run.end);
  });
  return [...times].sort((a: number, b: number) => a - b);
}
