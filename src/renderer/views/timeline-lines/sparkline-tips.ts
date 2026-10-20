import type { AgentSnapshot } from '../../../shared/types';
import { formatClock, formatDuration } from '../../format';
import type { Tip } from '../../tooltip';
import type { CountStep } from './agent-count-series';

// Past this many the tip would grow taller than the lane it explains.
const MAX_LISTED_AGENTS: number = 5;

// What one flat stretch of a chat's line means: how many agents ran then, and which.
export function countStepTip(step: CountStep, peak: number): Tip {
  return {
    title: countTitle(step.agents.length),
    lines: [
      `${formatClock(step.start)}–${formatClock(step.end)} (${formatDuration(step.end - step.start)})`,
      ...listedAgents(step.agents),
      `Peak in this window: ${peak}`,
      "Line: how many of this chat's agents were running at each moment.",
    ],
  };
}

function countTitle(count: number): string {
  if (count === 0) return 'No agents running';
  return count === 1 ? '1 agent running' : `${count} agents running`;
}

function listedAgents(agents: readonly AgentSnapshot[]): string[] {
  const listed: string[] = agents.slice(0, MAX_LISTED_AGENTS).map((agent: AgentSnapshot) => `• ${agent.description} (${agent.agentType})`);
  const hidden: number = agents.length - MAX_LISTED_AGENTS;
  return hidden > 0 ? [...listed, `+${hidden} more`] : listed;
}
