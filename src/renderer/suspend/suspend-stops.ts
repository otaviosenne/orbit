import type { ChatWork } from '../../shared/chat-work';
import { chatWork } from '../../shared/chat-work';
import type { ChatSnapshot } from '../../shared/types';

// What closing a chat right now would cut short.
export type SuspendStops = ChatWork;

export function suspendStops(chat: ChatSnapshot): SuspendStops {
  return chatWork(chat);
}

// Suspending is reversible, so it only asks first when it would stop work; null means it needs no confirmation.
export function suspendWarning(stops: SuspendStops): string | null {
  const parts: string[] = [
    ...(stops.isWorking ? ['its current turn'] : []),
    ...(stops.agents > 0 ? [counted(stops.agents, 'running agent')] : []),
    ...(stops.shells > 0 ? [counted(stops.shells, 'background shell')] : []),
  ];
  return parts.length === 0 ? null : `Stops ${joinedList(parts)}.`;
}

function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function joinedList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
