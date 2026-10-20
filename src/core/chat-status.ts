import type { ChatStatus } from '../shared/types';

const KNOWN_STATUSES: readonly ChatStatus[] = ['busy', 'waiting', 'idle', 'shell'];

export function normalizeStatus(raw: string | undefined): ChatStatus {
  return KNOWN_STATUSES.find((status: ChatStatus) => status === raw) ?? 'unknown';
}
