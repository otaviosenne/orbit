import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ApprovalRequest } from '../../shared/approval';
import { isApprovalAction, MAX_SUMMARY_LENGTH } from '../../shared/approval';

// Written by Orbit's MCP server (src/mcp), one file per chat process, replaced by the chat's next request.
export const APPROVALS_DIR: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'approvals');

const APPROVAL_SUFFIX: string = '.json';

// Keyed by the Claude Code process: a chat keeps its pid across /clear and /resume, unlike its session id.
export function approvalPath(pid: number): string {
  return join(APPROVALS_DIR, `${pid}${APPROVAL_SUFFIX}`);
}

// The chat's Claude Code session, which the MCP server adds to the request; null from an older server.
export function approvalSessionId(raw: unknown): string | null {
  const sessionId: unknown = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>)['sessionId'] : null;
  return typeof sessionId === 'string' ? sessionId : null;
}

// The file is written by another program, so every field is checked before it reaches the screen.
export function parseApproval(raw: unknown): ApprovalRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record: Record<string, unknown> = raw as Record<string, unknown>;
  const { action, summary, requestedAt } = record;
  if (!isApprovalAction(action) || typeof summary !== 'string' || typeof requestedAt !== 'number') return null;
  const text: string = summary.trim();
  return text.length === 0 ? null : { action, summary: text.slice(0, MAX_SUMMARY_LENGTH), requestedAt };
}
