import type { AgentSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';
import { renderAgentDot } from '../sheet/agent-dot';

// Working agents first, then the quiet ones; oldest first within each.
export function activeAgents(agents: readonly AgentSnapshot[]): AgentSnapshot[] {
  return agents
    .filter((agent: AgentSnapshot) => agent.state !== 'done')
    .sort((a: AgentSnapshot, b: AgentSnapshot) => quietRank(a) - quietRank(b) || a.startedAt - b.startedAt);
}

function quietRank(agent: AgentSnapshot): number {
  return agent.state === 'quiet' ? 1 : 0;
}

// More than this and the card would grow past what a glance at the board needs.
const MAX_CARD_AGENTS: number = 3;

// Only agents that are working right now: quiet and finished ones are noise on the board (the chat
// panel and the timeline still show them). Past the cap, a "+N more" line stands in for the rest.
export function renderAgentRows(agents: readonly AgentSnapshot[], now: number): HTMLElement[] {
  const running: AgentSnapshot[] = activeAgents(agents).filter((agent: AgentSnapshot) => agent.state === 'running');
  const rows: HTMLElement[] = running.slice(0, MAX_CARD_AGENTS).map((agent: AgentSnapshot) => renderAgentRow(agent, now));
  const hidden: number = running.length - MAX_CARD_AGENTS;
  if (hidden > 0) rows.push(element('div', 'agents-done', `+${hidden} more ${hidden === 1 ? 'agent' : 'agents'}`));
  return rows;
}

function renderAgentRow(agent: AgentSnapshot, now: number): HTMLElement {
  const row: HTMLElement = element('div', `agent agent-${agent.state}`);
  row.title = agent.description;
  const name: HTMLSpanElement = element('span', 'agent-name', agent.description);
  name.prepend(renderAgentDot(agent));
  row.append(name, element('span', 'agent-time', agentTiming(agent, now)));
  return row;
}

function agentTiming(agent: AgentSnapshot, now: number): string {
  if (agent.state === 'quiet') return `quiet ${formatDuration(now - agent.lastActivityAt)}`;
  return formatDuration(now - agent.startedAt);
}
