import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APPROVALS_DIR } from './approval-file';

// Chats the user answered "Always approve": one empty file per Claude Code session, so a request from that chat is
// approved by the MCP server itself and never reaches the screen. Keyed by session, not pid: a chat reopened with
// /resume keeps its say-so, a new chat in the same terminal does not.
const ALWAYS_FOLDER: string = 'always';

export function alwaysDirOf(approvalsDir: string): string {
  return join(approvalsDir, ALWAYS_FOLDER);
}

const ALWAYS_DIR: string = alwaysDirOf(APPROVALS_DIR);
// Session ids are uuids; anything else could climb out of the folder.
const SESSION_ID_PATTERN: RegExp = /^[A-Za-z0-9-]+$/;

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value);
}

export async function alwaysApprove(sessionId: string, dir: string = ALWAYS_DIR): Promise<void> {
  if (!isSessionId(sessionId)) return;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, sessionId), '');
}

export async function isAlwaysApproved(sessionId: string | null, dir: string = ALWAYS_DIR): Promise<boolean> {
  if (!isSessionId(sessionId)) return false;
  try {
    await access(join(dir, sessionId));
    return true;
  } catch {
    return false;
  }
}
