import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AskRequest } from '../../shared/ask';
import { parseAsk } from '../../shared/ask';
import type { ApprovalChat } from '../approvals/approval-reader';
import { isOpen } from '../approvals/approval-reader';

// Written by Orbit's MCP server (src/mcp), one file per chat process, beside the approvals so both can be open.
export const ASKS_DIR: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'asks');

const ASK_SUFFIX: string = '.json';

// Keyed by the Claude Code process: a chat keeps its pid across /clear and /resume, unlike its session id.
export function askPath(pid: number): string {
  return join(ASKS_DIR, `${pid}${ASK_SUFFIX}`);
}

// The chat's open ask, or null; it closes the same way an approval does, once the chat works again.
export async function readAsk(chat: ApprovalChat): Promise<AskRequest | null> {
  const request: AskRequest | null = await readRequest(chat.pid);
  return request !== null && isOpen(request, chat) ? request : null;
}

async function readRequest(pid: number): Promise<AskRequest | null> {
  try {
    return parseAsk(JSON.parse(await readFile(askPath(pid), 'utf8')) as unknown);
  } catch {
    return null;
  }
}
