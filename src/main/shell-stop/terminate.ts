import { delay } from '../run-command';
import { isAlive } from './process-table';
import type { ProcessRef } from './shell-processes';

// Long enough for a command to clean up after SIGTERM, short enough that Interrupt feels immediate.
const KILL_GRACE_MS: number = 3000;
const ALIVE_POLL_MS: number = 100;

// SIGTERM to all, then SIGKILL to whatever is still there after the grace period; each pid is re-checked
// against its start time right before every signal, so a pid reused by another process is never hit.
export async function terminate(processes: readonly ProcessRef[]): Promise<void> {
  await signalAlive(processes, 'SIGTERM');
  const deadline: number = Date.now() + KILL_GRACE_MS;
  while (Date.now() < deadline) {
    if ((await aliveOf(processes)).length === 0) return;
    await delay(ALIVE_POLL_MS);
  }
  await signalAlive(processes, 'SIGKILL');
}

export async function aliveOf(processes: readonly ProcessRef[]): Promise<ProcessRef[]> {
  const alive: boolean[] = await Promise.all(processes.map(isAlive));
  return processes.filter((_process: ProcessRef, index: number) => alive[index] === true);
}

async function signalAlive(processes: readonly ProcessRef[], signal: NodeJS.Signals): Promise<void> {
  for (const process of await aliveOf(processes)) {
    try {
      globalThis.process.kill(process.pid, signal);
    } catch {
      // It exited between the check and the signal, which is what was wanted.
    }
  }
}
