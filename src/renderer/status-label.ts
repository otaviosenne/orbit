import type { ChatStatus } from '../shared/types';

const CHAT_STATUS_LABELS: Readonly<Record<ChatStatus, string>> = {
  busy: 'Working',
  waiting: 'Needs you',
  idle: 'Idle',
  shell: 'Shell',
  unknown: 'Unknown',
};

export function chatStatusLabel(status: ChatStatus): string {
  return CHAT_STATUS_LABELS[status];
}
