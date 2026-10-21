import { USER_HZ } from '../process-start';
import type { ProcessSample } from './process-sample';

const SECOND_MS: number = 1000;
const PERCENT: number = 100;

// What each process had used at the previous sample, by pid.
export type TickBook = ReadonlyMap<number, ProcessSample>;

export function toTickBook(samples: readonly ProcessSample[]): TickBook {
  return new Map(samples.map((sample: ProcessSample): [number, ProcessSample] => [sample.pid, sample]));
}

// CPU used since the previous sample. Every process was in the previous book, so one missing from it, or with another
// start time (a reused pid), began inside the window and all its ticks belong to it.
export function ticksSince(sample: ProcessSample, previous: TickBook): number {
  const before: ProcessSample | undefined = previous.get(sample.pid);
  if (before === undefined || before.startTime !== sample.startTime) return sample.cpuTicks;
  return Math.max(0, sample.cpuTicks - before.cpuTicks);
}

// Summed per process rather than tree minus tree: a child that exits between samples must not make the chat negative.
export function treeTicksSince(pids: readonly number[], current: TickBook, previous: TickBook): number {
  let ticks: number = 0;
  for (const pid of pids) {
    const sample: ProcessSample | undefined = current.get(pid);
    if (sample !== undefined) ticks += ticksSince(sample, previous);
  }
  return ticks;
}

// As top shows it: 100 is one core busy for the whole window.
export function cpuPercent(ticks: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (ticks / USER_HZ / (elapsedMs / SECOND_MS)) * PERCENT;
}
