import { readdir, readFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { mapLimited } from '../map-limited';
import { listLiveSessions } from '../session-registry';
import type { SessionRecord } from '../session-registry';
import type { ProcessSample } from './process-sample';
import { parseProcessSample } from './process-sample';
import type { ChatRoot } from './process-tree';
import { parsePssBytes } from './pss';

const PROC: string = '/proc';
const PID_NAME: RegExp = /^\d+$/;
// Hundreds of tiny reads every couple of seconds; capped so they never hog libuv's small thread pool.
const READ_CONCURRENCY: number = 16;

// Everything the sampler reads from the machine, so its bookkeeping can be tested without /proc or a real clock.
export interface ResourceSource {
  chatRoots(): Promise<ChatRoot[]>;
  processes(): Promise<ProcessSample[]>;
  // PSS of each process, in the order asked.
  memoryBytes(pids: readonly number[]): Promise<number[]>;
  coreCount(): number;
  // Monotonic milliseconds, for the CPU window; a wall clock jump must not distort it.
  monotonicMs(): number;
  wait(ms: number): Promise<void>;
}

export const procResourceSource: ResourceSource = {
  chatRoots: readChatRoots,
  processes: readProcesses,
  memoryBytes: (pids: readonly number[]): Promise<number[]> => mapLimited(pids, READ_CONCURRENCY, readPssBytes),
  coreCount: (): number => availableParallelism(),
  monotonicMs: (): number => performance.now(),
  wait: (ms: number): Promise<void> => new Promise((resolve: () => void): void => void setTimeout(resolve, ms)),
};

async function readChatRoots(): Promise<ChatRoot[]> {
  const sessions: SessionRecord[] = await listLiveSessions().catch((): SessionRecord[] => []);
  return sessions.map((session: SessionRecord): ChatRoot => ({ sessionId: session.sessionId, pid: session.pid }));
}

// Every process on the machine: the tree is found by parent pid, and a process not seen before must be told apart
// from one simply not looked at.
async function readProcesses(): Promise<ProcessSample[]> {
  const pids: number[] = (await readdir(PROC)).filter((name: string) => PID_NAME.test(name)).map(Number);
  const samples: (ProcessSample | null)[] = await mapLimited(pids, READ_CONCURRENCY, readSample);
  return samples.filter((sample: ProcessSample | null): sample is ProcessSample => sample !== null);
}

async function readSample(pid: number): Promise<ProcessSample | null> {
  try {
    return parseProcessSample(pid, await readFile(`${PROC}/${pid}/stat`, 'utf8'));
  } catch {
    return null;
  }
}

// A process that exited meanwhile, or one run as another user (sudo), has no readable rollup and adds nothing.
async function readPssBytes(pid: number): Promise<number> {
  try {
    return parsePssBytes(await readFile(`${PROC}/${pid}/smaps_rollup`, 'utf8')) ?? 0;
  } catch {
    return 0;
  }
}
