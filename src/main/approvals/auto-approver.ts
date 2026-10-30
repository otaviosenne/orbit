import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { alwaysDirOf, isAlwaysApproved } from '../../core/approvals/always-approved';
import { APPROVALS_DIR, approvalSessionId, parseApproval } from '../../core/approvals/approval-file';
import type { ApprovalRequest } from '../../shared/approval';
import { answerApproval } from './approval-answerer';

// A new MCP server approves an always-approved chat by itself, but a chat started before Always approve existed
// keeps running the old server, which still puts the request on screen. Orbit answers those for it.
const CHECK_EVERY_MS: number = 2000;
// Seen within a check or two of being asked; anything older is a chat that went away, not one waiting.
const FRESH_FOR_MS: number = 60_000;
const REQUEST_FILE: RegExp = /^(\d+)\.json$/;

export function startAutoApprover(dir: string = APPROVALS_DIR): void {
  // Each request once: a chat that could not be typed into keeps its bar, for the user to answer.
  const tried: Set<string> = new Set();
  setInterval((): void => void approvePending(dir, tried, Date.now()), CHECK_EVERY_MS);
}

export async function approvePending(dir: string, tried: Set<string>, now: number, answer: typeof answerApproval = answerApproval): Promise<void> {
  const names: readonly string[] = await readdir(dir).catch((): string[] => []);
  for (const name of names) {
    const pid: number | null = pidOf(name);
    if (pid === null) continue;
    const raw: unknown = await readJson(join(dir, name));
    const request: ApprovalRequest | null = parseApproval(raw);
    if (request === null || now - request.requestedAt > FRESH_FOR_MS) continue;
    const key: string = `${pid}:${request.requestedAt}`;
    if (tried.has(key) || !(await isAlwaysApproved(approvalSessionId(raw), alwaysDirOf(dir)))) continue;
    tried.add(key);
    await answer(pid, 'approve');
  }
}

function pidOf(name: string): number | null {
  const match: RegExpExecArray | null = REQUEST_FILE.exec(name);
  return match === null ? null : Number(match[1]);
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch {
    return null;
  }
}
