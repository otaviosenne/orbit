import type { AgentSnapshot, ChatSnapshot, TimeSpan } from '../../shared/types';
import { formatClock, formatDuration } from '../format';
import type { Tip } from '../tooltip';

// What each mark on the timeline means, shown on hover.

export function runningAgentTip(agent: AgentSnapshot, now: number): Tip {
  return {
    title: agent.description,
    lines: [`Agent (${agent.agentType}) · running`, `Started ${formatClock(agent.startedAt)} · ${formatDuration(now - agent.startedAt)} so far`, 'Solid bar: an agent this chat started, still working.'],
  };
}

// The solid part of an agent that later went quiet: the stretch it was still writing.
export function wasWritingTip(agent: AgentSnapshot): Tip {
  return {
    title: agent.description,
    lines: [`Agent (${agent.agentType}) · writing`, `${formatClock(agent.startedAt)}–${formatClock(agent.lastActivityAt)} (${formatDuration(agent.lastActivityAt - agent.startedAt)})`, 'It went quiet after this; see the striped part.'],
  };
}

export function quietAgentTip(agent: AgentSnapshot, now: number): Tip {
  return {
    title: agent.description,
    lines: [`Agent (${agent.agentType}) · quiet`, `No output for ${formatDuration(now - agent.lastActivityAt)} (since ${formatClock(agent.lastActivityAt)})`, 'Striped: still open but silent. It may be waiting on something or stuck.'],
  };
}

export function finishedAgentTip(agent: AgentSnapshot, end: number): Tip {
  return {
    title: agent.description,
    lines: [`Agent (${agent.agentType}) · finished`, `${formatClock(agent.startedAt)}–${formatClock(end)} (${formatDuration(end - agent.startedAt)})`, 'Faded bar: an agent that is done.'],
  };
}

export function chatStatusTip(chat: ChatSnapshot, now: number): Tip {
  const since: string = `Since ${formatClock(chat.statusSince)} (${formatDuration(now - chat.statusSince)})`;
  if (chat.status === 'waiting') return { title: 'Chat waiting for you', lines: [since, 'Thin line: the chat itself is stopped on a question or permission prompt.'] };
  return { title: 'Chat working', lines: [since, 'Thin line: the chat itself working on your last message; its agents are the bars above.'] };
}

export function closedTurnTip(turn: TimeSpan): Tip {
  return {
    title: 'Chat was working',
    lines: [`${formatClock(turn.start)}–${formatClock(turn.end)} (${formatDuration(turn.end - turn.start)})`, 'Thin line: one reply of this now-closed chat, from your message to its answer.'],
  };
}
