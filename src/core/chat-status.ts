import type { ChatStatus } from '../shared/types';

const KNOWN_STATUSES: readonly ChatStatus[] = ['busy', 'waiting', 'idle', 'shell'];

// The waits that are a plain allow-or-deny prompt, as Claude Code names them in the session file; a question picker
// is "input needed".
const PERMISSION_WAITS: ReadonlySet<string> = new Set(['permission prompt', 'sandbox request']);

export function normalizeStatus(raw: string | undefined): ChatStatus {
  return KNOWN_STATUSES.find((status: ChatStatus) => status === raw) ?? 'unknown';
}

export function asksPermission(status: string | undefined, waitingFor: string | undefined): boolean {
  return status === 'waiting' && waitingFor !== undefined && PERMISSION_WAITS.has(waitingFor);
}
