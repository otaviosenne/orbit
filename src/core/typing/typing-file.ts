import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { TypingRequest } from '../../shared/typing-request';
import { parseTypingRequest } from '../../shared/typing-request';
import type { ApprovalChat } from '../approvals/approval-reader';
import { isOpen } from '../approvals/approval-reader';

// Written by Orbit's MCP server (src/mcp), one file per chat process, beside the asks and approvals.
export const TYPING_DIR: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'typing');

const TYPING_SUFFIX: string = '.json';

export function typingPath(pid: number): string {
  return join(TYPING_DIR, `${pid}${TYPING_SUFFIX}`);
}

// The chat's open typing request, or null; it closes like an ask once the chat works again.
export async function readTypingRequest(chat: ApprovalChat): Promise<TypingRequest | null> {
  try {
    const request: TypingRequest | null = parseTypingRequest(JSON.parse(await readFile(typingPath(chat.pid), 'utf8')) as unknown);
    return request !== null && isOpen(request, chat) ? request : null;
  } catch {
    return null;
  }
}
