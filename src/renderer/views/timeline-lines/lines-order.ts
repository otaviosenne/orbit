import type { AgentSnapshot, ChatSnapshot, ClosedChatActivity, TimeSpan } from '../../../shared/types';
import type { TimelineLane } from '../timeline-lanes';
import { agentRunEnd, runningAgentCount } from './agent-count-series';

// Busiest chats first, so whatever is fanning out the most work sits at the top. Chats that had agents in the
// window but none now come next, then chats with no agents at all; both of those by most recent activity.
// Closed chats always follow the open ones, newest first.
// Equal running counts fall back to the name, not to activity: busy chats touch their activity time on every
// poll, and ranking by it would make them trade places (and animate) every two seconds.
export function linesLaneOrder(lanes: readonly TimelineLane[], span: TimeSpan): TimelineLane[] {
  const open: ChatSnapshot[] = lanes.flatMap((lane: TimelineLane) => (lane.kind === 'open' ? [lane.chat] : []));
  const closed: ClosedChatActivity[] = lanes.flatMap((lane: TimelineLane) => (lane.kind === 'closed' ? [lane.chat] : []));
  return [
    ...[...open].sort((a: ChatSnapshot, b: ChatSnapshot) => compareOpen(a, b, span)).map((chat: ChatSnapshot): TimelineLane => ({ kind: 'open', chat })),
    ...[...closed].sort(byClosedRecency).map((chat: ClosedChatActivity): TimelineLane => ({ kind: 'closed', chat })),
  ];
}

export function hadAgentsIn(agents: readonly AgentSnapshot[], span: TimeSpan): boolean {
  return agents.some((agent: AgentSnapshot) => agentRunEnd(agent, span.end) > span.start);
}

// The latest thing the chat did: a status change or an agent's last output.
export function lastChatActivity(chat: ChatSnapshot): number {
  return chat.agents.reduce((latest: number, agent: AgentSnapshot) => Math.max(latest, agent.endedAt ?? agent.lastActivityAt), chat.statusSince);
}

function compareOpen(a: ChatSnapshot, b: ChatSnapshot, span: TimeSpan): number {
  const running: number = runningAgentCount(b.agents) - runningAgentCount(a.agents);
  if (running !== 0) return running;
  if (runningAgentCount(a.agents) > 0) return byName(a, b);
  const withAgents: number = Number(hadAgentsIn(b.agents, span)) - Number(hadAgentsIn(a.agents, span));
  return withAgents || lastChatActivity(b) - lastChatActivity(a) || byName(a, b);
}

function byName(a: ChatSnapshot, b: ChatSnapshot): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.sessionId.localeCompare(b.sessionId);
}

function byClosedRecency(a: ClosedChatActivity, b: ClosedChatActivity): number {
  return b.lastActivityAt - a.lastActivityAt || a.sessionId.localeCompare(b.sessionId);
}
