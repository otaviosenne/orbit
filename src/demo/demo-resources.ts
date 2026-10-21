import type { ChatResourceUsage, ResourceSnapshot } from '../shared/chat-resources';
import type { ChatStatus } from '../shared/types';
import type { DemoChat } from './demo-chats';
import { DEMO_CHATS } from './demo-chats';
import { SECOND_MS } from './demo-clock';

const DEMO_CORE_COUNT: number = 8;
const MB: number = 1024 * 1024;
// Working chats run tools and agents; the rest sit almost idle, as real ones do.
const BASE_CPU_PERCENT: Readonly<Record<ChatStatus, number>> = { busy: 38, shell: 22, waiting: 3, idle: 1, unknown: 1 };
const BASE_MEMORY_MB: number = 310;
const MEMORY_STEP_MB: number = 85;
const PROCESS_BASE: number = 4;
const PROCESS_SPREAD: number = 7;
// A slow swing, so the numbers move between polls like real ones without jumping around.
const WOBBLE_PERIOD_MS: number = 9 * SECOND_MS;
const WOBBLE_SHARE: number = 0.35;
const FULL_TURN: number = 2 * Math.PI;

export function demoResources(now: number): ResourceSnapshot {
  return { coreCount: DEMO_CORE_COUNT, sampledAt: now, chats: DEMO_CHATS.map((chat: DemoChat, index: number) => demoUsage(chat, index, now)) };
}

function demoUsage(chat: DemoChat, index: number, now: number): ChatResourceUsage {
  const wobble: number = 1 + WOBBLE_SHARE * Math.sin((now / WOBBLE_PERIOD_MS) * FULL_TURN + index);
  return {
    sessionId: chat.sessionId,
    pid: chat.pid,
    cpuPercent: BASE_CPU_PERCENT[chat.status] * wobble,
    memoryBytes: (BASE_MEMORY_MB + MEMORY_STEP_MB * (index % PROCESS_SPREAD)) * MB,
    processCount: PROCESS_BASE + ((index * PROCESS_BASE) % PROCESS_SPREAD),
  };
}
