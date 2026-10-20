import type { AgentSnapshot } from '../../shared/types';

// A closed chat's agents stopped with it, so one that never reported finishing ends at its last write
// instead of looking quiet and stretching on to now.
export function settleClosedAgents(agents: readonly AgentSnapshot[]): AgentSnapshot[] {
  return agents.map((agent: AgentSnapshot): AgentSnapshot =>
    agent.state === 'done' ? agent : { ...agent, state: 'done', endedAt: agent.lastActivityAt },
  );
}
