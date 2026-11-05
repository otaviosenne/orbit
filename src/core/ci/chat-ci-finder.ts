import { readFile } from 'node:fs/promises';
import type { LocalCiRun } from '../../shared/local-ci';
import { processStartedAt } from '../process-start';
import { localCiOptions } from '../local-ci/local-ci-command';
import { isCiCommand } from './ci-command';

// chat → bash -c (the Bash tool) → a wrapper such as run-ci-queue.sh → bash local-ci.sh, with room for make or npm run.
const MAX_DEPTH: number = 4;

export interface ChatCi {
  // The monorepo's local CI, which gets its own green bar with its options and time.
  readonly localCi: LocalCiRun | null;
  // Any CI at all, local or GitHub's, which turns the chat's spinner green.
  readonly runsCi: boolean;
}

const NO_CI: ChatCi = { localCi: null, runsCi: false };

// The CI this chat started, in the foreground or in the background.
export async function findChatCi(chatPid: number): Promise<ChatCi> {
  let found: ChatCi = NO_CI;
  let level: number[] = await childrenOf(chatPid);
  for (let depth: number = 1; depth <= MAX_DEPTH && level.length > 0; depth++) {
    for (const pid of level) found = await withCommand(found, pid);
    if (found.localCi !== null) return found;
    level = (await Promise.all(level.map(childrenOf))).flat();
  }
  return found;
}

async function withCommand(found: ChatCi, pid: number): Promise<ChatCi> {
  const argv: string[] = await commandLine(pid);
  const options: string[] | null = localCiOptions(argv);
  const startedAt: number | null = options === null ? null : await processStartedAt(pid);
  if (options !== null && startedAt !== null) return { localCi: { startedAt, options }, runsCi: true };
  return isCiCommand(argv) ? { ...found, runsCi: true } : found;
}

// The kernel lists a process's direct children per thread; the main thread's list holds the ones it spawned.
async function childrenOf(pid: number): Promise<number[]> {
  try {
    return (await readFile(`/proc/${pid}/task/${pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

async function commandLine(pid: number): Promise<string[]> {
  try {
    return (await readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0').filter((argument: string) => argument.length > 0);
  } catch {
    return [];
  }
}
