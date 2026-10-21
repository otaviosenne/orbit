import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Written by ~/.claude/hooks/orbit-save-question.sh, one file per chat, replaced on every new question.
const QUESTIONS_DIR: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'questions');
const SESSION_ID_PATTERN: RegExp = /^[A-Za-z0-9-]+$/;

// The raw record the hook saved for this chat, or null when there is none (the hook is optional).
export async function readHookedRecord(sessionId: string): Promise<unknown> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return null;
  try {
    return JSON.parse(await readFile(join(QUESTIONS_DIR, `${sessionId}.json`), 'utf8')) as unknown;
  } catch {
    return null;
  }
}
