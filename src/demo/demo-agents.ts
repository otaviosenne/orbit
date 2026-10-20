import type { AgentSnapshot, AgentState } from '../shared/types';
import { minutesBeforeLaunch } from './demo-clock';

export interface DemoAgentSpec {
  readonly id: string;
  readonly description: string;
  readonly agentType: string;
  readonly state: AgentState;
  readonly startedMinutesAgo: number;
  readonly lastActivityMinutesAgo: number;
}

export function toAgentSnapshot(spec: DemoAgentSpec): AgentSnapshot {
  const lastActivityAt: number = minutesBeforeLaunch(spec.lastActivityMinutesAgo);
  return {
    id: spec.id,
    description: spec.description,
    agentType: spec.agentType,
    state: spec.state,
    startedAt: minutesBeforeLaunch(spec.startedMinutesAgo),
    lastActivityAt,
    endedAt: spec.state === 'done' ? lastActivityAt : null,
  };
}
