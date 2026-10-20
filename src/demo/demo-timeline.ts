import type { ClosedChatActivity, TimeSpan } from '../shared/types';
import type { DemoAgentSpec } from './demo-agents';
import { toAgentSnapshot } from './demo-agents';
import { minutesBeforeLaunch } from './demo-clock';
import { DEMO_REPOSITORIES } from './demo-repositories';

// [started, ended] in minutes before launch.
type MinuteSpan = readonly [number, number];

interface DemoClosedChat {
  readonly base: Omit<ClosedChatActivity, 'turns' | 'agents' | 'lastActivityAt'>;
  readonly turns: readonly MinuteSpan[];
  readonly agents: readonly DemoAgentSpec[];
}

const CLOSED_CHATS: readonly DemoClosedChat[] = [
  {
    base: { sessionId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', title: 'Dark mode for the dashboard', repository: DEMO_REPOSITORIES.acmeWeb, color: 'purple' },
    turns: [[118, 104], [92, 74]],
    agents: [{ id: 'b1c2d3e4f5a6b7c8d', description: 'Find hard-coded colors', agentType: 'Explore', state: 'done', startedMinutesAgo: 90, lastActivityMinutesAgo: 79 }],
  },
  {
    base: { sessionId: '1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e', title: 'Refund flow for partial orders', repository: DEMO_REPOSITORIES.billingApi, color: 'orange' },
    turns: [[110, 96], [66, 48]],
    agents: [{ id: 'c2d3e4f5a6b7c8d9e', description: 'Write refund tests', agentType: 'general-purpose', state: 'done', startedMinutesAgo: 62, lastActivityMinutesAgo: 52 }],
  },
  {
    base: { sessionId: '4e5f6a7b-8c9d-4eaf-80b1-3c4d5e6f7a8b', title: 'Offline cart sync', repository: DEMO_REPOSITORIES.mobileApp, color: 'pink' },
    turns: [[58, 44], [30, 19]],
    agents: [],
  },
];

// Closed chats that were active since that time, like the real history reader.
export function demoTimelineHistory(sinceMs: unknown): ClosedChatActivity[] {
  const since: number = typeof sinceMs === 'number' ? sinceMs : 0;
  return CLOSED_CHATS.map(toActivity).filter((chat: ClosedChatActivity) => chat.lastActivityAt >= since);
}

function toActivity(chat: DemoClosedChat): ClosedChatActivity {
  const turns: TimeSpan[] = chat.turns.map(([start, end]: MinuteSpan) => ({ start: minutesBeforeLaunch(start), end: minutesBeforeLaunch(end) }));
  return {
    ...chat.base,
    lastActivityAt: Math.max(...turns.map((turn: TimeSpan) => turn.end)),
    turns,
    agents: chat.agents.map(toAgentSnapshot),
  };
}
