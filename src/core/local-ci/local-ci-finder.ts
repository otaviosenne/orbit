import { readFile } from 'node:fs/promises';
import type { LocalCiRun } from '../../shared/local-ci';
import { processStartedAt } from '../process-start';
import { localCiOptions } from './local-ci-command';

// chat → bash -c (the Bash tool) → bash local-ci.sh, with room for a wrapper such as make or npm run.
const MAX_DEPTH: number = 4;

// The local CI run started by this chat, in the foreground or in the background; null when none is running.
export async function findLocalCi(chatPid: number): Promise<LocalCiRun | null> {
  let level: number[] = await childrenOf(chatPid);
  for (let depth: number = 1; depth <= MAX_DEPTH && level.length > 0; depth++) {
    for (const pid of level) {
      const options: string[] | null = localCiOptions(await commandLine(pid));
      if (options === null) continue;
      const startedAt: number | null = await processStartedAt(pid);
      if (startedAt !== null) return { startedAt, options };
    }
    level = (await Promise.all(level.map(childrenOf))).flat();
  }
  return null;
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
