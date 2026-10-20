import type { ChatColor } from '../shared/chat-colors';
import type { PastChat, Repository } from '../shared/types';
import { minutesBeforeLaunch } from './demo-clock';
import { DEMO_REPOSITORIES } from './demo-repositories';

const MINUTES_PER_DAY: number = 24 * 60;
const KILOBYTE: number = 1024;

interface DemoPastChat {
  readonly sessionId: string;
  readonly title: string;
  readonly repository: Repository;
  readonly color: ChatColor | null;
  readonly daysAgo: number;
  readonly sizeKb: number;
}

const PAST_CHATS: readonly DemoPastChat[] = [
  { sessionId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', title: 'Dark mode for the dashboard', repository: DEMO_REPOSITORIES.acmeWeb, color: 'purple', daysAgo: 0.2, sizeKb: 812 },
  { sessionId: '1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e', title: 'Refund flow for partial orders', repository: DEMO_REPOSITORIES.billingApi, color: 'orange', daysAgo: 0.6, sizeKb: 1430 },
  { sessionId: '2c3d4e5f-6a7b-4c8d-ae9f-1a2b3c4d5e6f', title: 'Search page performance', repository: DEMO_REPOSITORIES.acmeWeb, color: 'blue', daysAgo: 1.1, sizeKb: 2210 },
  { sessionId: '3d4e5f6a-7b8c-4d9e-bf0a-2b3c4d5e6f7a', title: 'Migrate docs to MDX', repository: DEMO_REPOSITORIES.docsSite, color: null, daysAgo: 1.4, sizeKb: 640 },
  { sessionId: '4e5f6a7b-8c9d-4eaf-80b1-3c4d5e6f7a8b', title: 'Offline cart sync', repository: DEMO_REPOSITORIES.mobileApp, color: 'pink', daysAgo: 2.3, sizeKb: 3120 },
  { sessionId: '5f6a7b8c-9d0e-4fb0-91c2-4d5e6f7a8b9c', title: 'Rotate database credentials', repository: DEMO_REPOSITORIES.infra, color: 'red', daysAgo: 3.0, sizeKb: 290 },
  { sessionId: '6a7b8c9d-0e1f-40c1-a2d3-5e6f7a8b9c0d', title: 'Tax rates per region', repository: DEMO_REPOSITORIES.billingApi, color: 'green', daysAgo: 4.5, sizeKb: 980 },
  { sessionId: '7b8c9d0e-1f2a-41d2-b3e4-6f7a8b9c0d1e', title: 'Onboarding tour', repository: DEMO_REPOSITORIES.acmeWeb, color: 'yellow', daysAgo: 6.2, sizeKb: 1570 },
  { sessionId: '8c9d0e1f-2a3b-42e3-84f5-7a8b9c0d1e2f', title: 'Versioned API docs', repository: DEMO_REPOSITORIES.docsSite, color: 'cyan', daysAgo: 9.0, sizeKb: 720 },
  { sessionId: '9d0e1f2a-3b4c-43f4-95a6-8b9c0d1e2f3a', title: 'Biometric login', repository: DEMO_REPOSITORIES.mobileApp, color: null, daysAgo: 12.4, sizeKb: 2050 },
  { sessionId: 'ae0f1a2b-4c5d-44a5-a6b7-9c0d1e2f3a4b', title: 'CDN cache headers', repository: DEMO_REPOSITORIES.infra, color: 'blue', daysAgo: 18.7, sizeKb: 410 },
  { sessionId: 'bf1a2b3c-5d6e-45b6-b7c8-0d1e2f3a4b5c', title: 'Subscription upgrades mid-cycle', repository: DEMO_REPOSITORIES.billingApi, color: 'purple', daysAgo: 26.0, sizeKb: 1880 },
];

export function demoPastChats(): PastChat[] {
  return PAST_CHATS.map((chat: DemoPastChat) => ({
    sessionId: chat.sessionId,
    title: chat.title,
    repository: chat.repository,
    lastActivityAt: minutesBeforeLaunch(chat.daysAgo * MINUTES_PER_DAY),
    sizeBytes: chat.sizeKb * KILOBYTE,
  }));
}

export function demoPastChatColor(sessionId: unknown): ChatColor | null {
  return PAST_CHATS.find((chat: DemoPastChat) => chat.sessionId === sessionId)?.color ?? null;
}
