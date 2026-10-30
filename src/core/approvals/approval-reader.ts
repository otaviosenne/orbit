import { readFile } from 'node:fs/promises';
import type { ApprovalRequest } from '../../shared/approval';
import { approvalPath, parseApproval } from './approval-file';

// What the chat's process looks like now, as Claude Code's session file records it.
export interface ApprovalChat {
  readonly pid: number;
  readonly startedAt: number;
  readonly status: string;
  readonly statusUpdatedAt: number;
}

const BUSY_STATUS: string = 'busy';

// The chat's open request, or null. A file older than the process belongs to an earlier one with the same pid.
export async function readApproval(chat: ApprovalChat): Promise<ApprovalRequest | null> {
  const request: ApprovalRequest | null = await readRequest(chat.pid);
  return request !== null && isOpen(request, chat) ? request : null;
}

// After asking, the chat ends its turn; working again means the user answered some other way (typed in the chat
// or its terminal), so the question on screen is no longer the one the chat waits on.
export function isOpen(request: ApprovalRequest, chat: ApprovalChat): boolean {
  if (request.requestedAt < chat.startedAt) return false;
  return !(chat.status === BUSY_STATUS && chat.statusUpdatedAt > request.requestedAt);
}

async function readRequest(pid: number): Promise<ApprovalRequest | null> {
  try {
    return parseApproval(JSON.parse(await readFile(approvalPath(pid), 'utf8')) as unknown);
  } catch {
    return null;
  }
}
