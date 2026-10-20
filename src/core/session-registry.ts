import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SESSIONS_DIR } from './config';
import { isSameProcess } from './process-identity';

export interface SessionRecord {
  readonly pid: number;
  readonly sessionId: string;
  readonly cwd: string;
  readonly startedAt: number;
  readonly procStart: string;
  readonly name: string;
  readonly status: string;
  readonly statusUpdatedAt: number;
  readonly kind?: string;
}

// Only chats someone is using; `claude -p` runs (such as the radar's own triage) are not chats.
const INTERACTIVE_KIND: string = 'interactive';

const SESSION_FILE_SUFFIX: string = '.json';

export async function listLiveSessions(): Promise<SessionRecord[]> {
  const files: string[] = (await readdir(SESSIONS_DIR)).filter((file: string) => file.endsWith(SESSION_FILE_SUFFIX));
  const sessions: (SessionRecord | null)[] = await Promise.all(files.map(readLiveSession));
  return sessions.filter((session: SessionRecord | null): session is SessionRecord => session !== null);
}

async function readLiveSession(file: string): Promise<SessionRecord | null> {
  const session: SessionRecord | null = await readSessionFile(join(SESSIONS_DIR, file));
  if (session === null || (session.kind !== undefined && session.kind !== INTERACTIVE_KIND)) return null;
  return (await isSameProcess(session.pid, session.procStart)) ? session : null;
}

async function readSessionFile(path: string): Promise<SessionRecord | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as SessionRecord;
  } catch {
    return null;
  }
}

export async function liveSessionIds(): Promise<Set<string>> {
  return new Set((await listLiveSessions()).map((session: SessionRecord) => session.sessionId));
}
