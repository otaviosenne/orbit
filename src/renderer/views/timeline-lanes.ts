import { clipSpans } from '../../shared/time-span';
import type { AgentSnapshot, ChatSnapshot, ClosedChatActivity, TimeSpan } from '../../shared/types';

export type TimelineLane =
  | { readonly kind: 'open'; readonly chat: ChatSnapshot }
  | { readonly kind: 'closed'; readonly chat: ClosedChatActivity };

// Open lanes come first, in the board's repository order, so live work keeps its place on every poll instead of
// shifting whenever a closed chat appears; closed lanes follow, newest first within each repository.
// History is fetched less often than chats are polled, so a chat open again wins over its stale closed copy.
export function timelineLanes(open: readonly ChatSnapshot[], closed: readonly ClosedChatActivity[], window: TimeSpan): TimelineLane[] {
  const openIds: ReadonlySet<string> = new Set(open.map((chat: ChatSnapshot) => chat.sessionId));
  const openLanes: TimelineLane[] = [...open].sort(byRepositoryThenName).map((chat: ChatSnapshot): TimelineLane => ({ kind: 'open', chat }));
  const closedLanes: TimelineLane[] = closed
    .filter((chat: ClosedChatActivity) => !openIds.has(chat.sessionId))
    .map((chat: ClosedChatActivity) => visibleIn(chat, window))
    .filter((chat: ClosedChatActivity | null): chat is ClosedChatActivity => chat !== null)
    .sort(byRepositoryThenRecency)
    .map((chat: ClosedChatActivity): TimelineLane => ({ kind: 'closed', chat }));
  return [...openLanes, ...closedLanes];
}

// The window keeps moving between history fetches, so activity that has scrolled out of it is dropped here.
function visibleIn(chat: ClosedChatActivity, window: TimeSpan): ClosedChatActivity | null {
  const turns: TimeSpan[] = clipSpans(chat.turns, window);
  const agents: AgentSnapshot[] = chat.agents.filter((agent: AgentSnapshot) => (agent.endedAt ?? agent.lastActivityAt) > window.start);
  return turns.length === 0 && agents.length === 0 ? null : { ...chat, turns, agents };
}

function byRepositoryThenName(a: ChatSnapshot, b: ChatSnapshot): number {
  return a.repository.name.localeCompare(b.repository.name) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function byRepositoryThenRecency(a: ClosedChatActivity, b: ClosedChatActivity): number {
  return a.repository.name.localeCompare(b.repository.name) || b.lastActivityAt - a.lastActivityAt;
}
