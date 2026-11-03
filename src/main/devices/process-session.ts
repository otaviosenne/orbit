import { readFile } from 'node:fs/promises';

const PROC: string = '/proc';
const VARIABLE_SEPARATOR: string = '\0';
// Set by Claude Code on every command a chat runs; MCP servers it starts carry the session id but not this.
const CHILD_MARK: string = 'CLAUDE_CODE_CHILD_SESSION=1';
const SESSION_PREFIX: string = 'CLAUDE_CODE_SESSION_ID=';

// The chat a process was started from, read from its environment once: it never changes for the life of the process.
// Forgotten for pids no longer listening, so a reused pid is read afresh.
export class ProcessSessions {
  private readonly known: Map<number, Promise<string | null>> = new Map();

  sessionOf(pid: number): Promise<string | null> {
    const cached: Promise<string | null> | undefined = this.known.get(pid);
    if (cached !== undefined) return cached;
    const session: Promise<string | null> = readSession(pid);
    this.known.set(pid, session);
    return session;
  }

  keepOnly(pids: ReadonlySet<number>): void {
    for (const pid of [...this.known.keys()]) if (!pids.has(pid)) this.known.delete(pid);
  }
}

// A process of another user, or one that exited meanwhile, has no readable environment.
async function readSession(pid: number): Promise<string | null> {
  const environment: string[] = (await readFile(`${PROC}/${pid}/environ`, 'utf8').catch((): string => '')).split(VARIABLE_SEPARATOR);
  if (!environment.includes(CHILD_MARK)) return null;
  return environment.find((variable: string) => variable.startsWith(SESSION_PREFIX))?.slice(SESSION_PREFIX.length) ?? null;
}
