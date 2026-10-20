import type { ChatColor } from '../shared/chat-colors';
import type { ChatSnapshot, ChatStatus, Repository, TranscriptItem } from '../shared/types';
import type { DemoAgentSpec } from './demo-agents';
import { toAgentSnapshot } from './demo-agents';
import { DEMO_EPOCH, SECOND_MS, minutesBeforeLaunch } from './demo-clock';
import { DEMO_REPOSITORIES } from './demo-repositories';
import { demoSurgeAgents } from './demo-surge';
import { invoicePdfTranscript, stripeWebhooksTranscript } from './transcripts/billing';
import { checkoutRedesignTranscript } from './transcripts/checkout-redesign';
import { apiReferenceTranscript, changelogTranscript } from './transcripts/docs';
import { flakyTestTranscript, pushNotificationsTranscript, terraformTranscript } from './transcripts/others';

// Long enough for the window to load first: a chat that finishes before the renderer starts counts as already seen.
const FINISH_AFTER_LAUNCH_MS: number = 12 * SECOND_MS;

export interface DemoChat {
  readonly sessionId: string;
  readonly pid: number;
  readonly name: string;
  readonly color: ChatColor | null;
  readonly repository: Repository;
  readonly startedMinutesAgo: number;
  readonly status: ChatStatus;
  readonly statusMinutesAgo: number;
  readonly agents: readonly DemoAgentSpec[];
  // Works at launch and goes idle a moment later, so it shows up in "Needs you" with an unread reply.
  readonly finishesAfterLaunch: boolean;
  readonly transcript: () => TranscriptItem[];
}

export const DEMO_CHATS: readonly DemoChat[] = [
  {
    sessionId: '3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c11',
    pid: 41021,
    name: 'Checkout redesign',
    color: 'blue',
    repository: DEMO_REPOSITORIES.acmeWeb,
    startedMinutesAgo: 95,
    status: 'busy',
    statusMinutesAgo: 4,
    agents: [
      { id: 'a4f1c9e27b3d5a8e1', description: 'Map checkout components', agentType: 'Explore', state: 'running', startedMinutesAgo: 3, lastActivityMinutesAgo: 0 },
      { id: 'a9b2e6d41c7f3e0a5', description: 'Write Playwright checkout tests', agentType: 'general-purpose', state: 'running', startedMinutesAgo: 2, lastActivityMinutesAgo: 0 },
      { id: 'a1d8f3b6e9c2a4d70', description: 'Audit payment form a11y', agentType: 'general-purpose', state: 'done', startedMinutesAgo: 30, lastActivityMinutesAgo: 22 },
    ],
    finishesAfterLaunch: false,
    transcript: checkoutRedesignTranscript,
  },
  {
    sessionId: '7a2e9c4b-1f3d-4e8a-b6c5-0d9e2f7a4b38',
    pid: 41188,
    name: 'Stripe webhooks',
    color: 'orange',
    repository: DEMO_REPOSITORIES.billingApi,
    startedMinutesAgo: 140,
    status: 'waiting',
    statusMinutesAgo: 2,
    agents: [
      { id: 'a3f8d2c6e1b9a7d45', description: 'Review webhook signature checks', agentType: 'general-purpose', state: 'done', startedMinutesAgo: 38, lastActivityMinutesAgo: 31 },
    ],
    finishesAfterLaunch: false,
    transcript: stripeWebhooksTranscript,
  },
  {
    sessionId: 'c81d4f6a-5e2b-4a9c-8d3f-6b1e7a0c2d95',
    pid: 41250,
    name: 'Invoice PDF export',
    color: 'green',
    repository: DEMO_REPOSITORIES.billingApi,
    startedMinutesAgo: 60,
    status: 'idle',
    statusMinutesAgo: 6,
    agents: [
      { id: 'a7e4b1d9c3f6a2e80', description: 'Find invoice templates', agentType: 'Explore', state: 'done', startedMinutesAgo: 14, lastActivityMinutesAgo: 10 },
    ],
    finishesAfterLaunch: true,
    transcript: invoicePdfTranscript,
  },
  {
    sessionId: '5b9e3d7c-2a4f-4c1e-9f8b-3e6d0a5c7b42',
    pid: 41377,
    name: 'API reference',
    color: 'purple',
    repository: DEMO_REPOSITORIES.docsSite,
    startedMinutesAgo: 75,
    status: 'busy',
    statusMinutesAgo: 9,
    agents: [
      { id: 'a6c3e9f12d8b4a7e0', description: 'Generate endpoint examples', agentType: 'general-purpose', state: 'quiet', startedMinutesAgo: 8, lastActivityMinutesAgo: 4 },
      { id: 'a2e7b5d93f1c6a8e4', description: 'Check broken links', agentType: 'Explore', state: 'done', startedMinutesAgo: 9, lastActivityMinutesAgo: 6 },
    ],
    finishesAfterLaunch: false,
    transcript: apiReferenceTranscript,
  },
  {
    sessionId: 'e4a7c2f9-6d1b-4e3a-8c5f-9b2d7e0a1c63',
    pid: 41402,
    name: 'Fix flaky e2e',
    color: 'cyan',
    repository: DEMO_REPOSITORIES.acmeWeb,
    startedMinutesAgo: 50,
    status: 'idle',
    statusMinutesAgo: 4,
    agents: [
      { id: 'a5d2c8f3b7e1a9c64', description: 'Reproduce the flake 20 times', agentType: 'general-purpose', state: 'done', startedMinutesAgo: 40, lastActivityMinutesAgo: 26 },
    ],
    finishesAfterLaunch: false,
    transcript: flakyTestTranscript,
  },
  {
    sessionId: '9d3b6e1f-4c8a-4f2e-a7d9-1c5e8b3f6a20',
    pid: 41519,
    name: 'Push notifications',
    color: 'pink',
    repository: DEMO_REPOSITORIES.mobileApp,
    startedMinutesAgo: 180,
    status: 'idle',
    statusMinutesAgo: 47,
    agents: [
      { id: 'a8b6e3f1d4c9a2e57', description: 'Compare push providers', agentType: 'Explore', state: 'done', startedMinutesAgo: 100, lastActivityMinutesAgo: 71 },
    ],
    finishesAfterLaunch: false,
    transcript: pushNotificationsTranscript,
  },
  {
    sessionId: '2c8f5a3d-7e9b-4d6c-b1a4-8f3e6c9d2b17',
    pid: 41630,
    name: 'Terraform upgrade',
    color: null,
    repository: DEMO_REPOSITORIES.infra,
    startedMinutesAgo: 240,
    status: 'idle',
    statusMinutesAgo: 128,
    agents: [],
    finishesAfterLaunch: false,
    transcript: terraformTranscript,
  },
  {
    sessionId: 'b6e1d9a4-3f7c-4b2e-9a6d-4c8f1e5b3a79',
    pid: 41744,
    name: 'Changelog 2.4',
    color: 'yellow',
    repository: DEMO_REPOSITORIES.docsSite,
    startedMinutesAgo: 25,
    status: 'busy',
    statusMinutesAgo: 1,
    agents: [],
    finishesAfterLaunch: false,
    transcript: changelogTranscript,
  },
];

export function demoChatSnapshots(now: number): ChatSnapshot[] {
  return DEMO_CHATS.map((chat: DemoChat) => toChatSnapshot(chat, now));
}

export function findDemoChat(sessionId: unknown): DemoChat | undefined {
  return DEMO_CHATS.find((chat: DemoChat) => chat.sessionId === sessionId);
}

function toChatSnapshot(chat: DemoChat, now: number): ChatSnapshot {
  return {
    sessionId: chat.sessionId,
    pid: chat.pid,
    name: chat.name,
    color: chat.color,
    repository: chat.repository,
    cwd: chat.repository.root,
    startedAt: minutesBeforeLaunch(chat.startedMinutesAgo),
    ...currentStatus(chat, now),
    agents: [...chat.agents.map(toAgentSnapshot), ...demoSurgeAgents(chat.sessionId, now)],
    shells: [],
    isFocused: false,
  };
}

function currentStatus(chat: DemoChat, now: number): Pick<ChatSnapshot, 'status' | 'statusSince'> {
  if (!chat.finishesAfterLaunch) return { status: chat.status, statusSince: minutesBeforeLaunch(chat.statusMinutesAgo) };
  const finishedAt: number = DEMO_EPOCH + FINISH_AFTER_LAUNCH_MS;
  if (now < finishedAt) return { status: 'busy', statusSince: minutesBeforeLaunch(chat.statusMinutesAgo) };
  return { status: chat.status, statusSince: finishedAt };
}

export function demoChatSnapshot(sessionId: unknown, now: number): ChatSnapshot | undefined {
  const chat: DemoChat | undefined = findDemoChat(sessionId);
  return chat === undefined ? undefined : toChatSnapshot(chat, now);
}
