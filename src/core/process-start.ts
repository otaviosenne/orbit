import { readFile } from 'node:fs/promises';
import { readProcessStat } from './process-identity';
import type { ProcessStat } from './process-identity';

const SECOND_MS: number = 1000;
// /proc reports start times in USER_HZ ticks, which Linux fixes at 100 whatever the kernel's own tick rate.
const USER_HZ: number = 100;
const BOOT_TIME_LINE: RegExp = /^btime\s+(\d+)$/m;

let bootTimeMs: Promise<number | null> | null = null;

// When the process started, in epoch milliseconds; null when it is gone or /proc cannot be read.
export async function processStartedAt(pid: number): Promise<number | null> {
  const [boot, processStat]: [number | null, ProcessStat | null] = await Promise.all([bootTime(), readProcessStat(pid)]);
  if (boot === null || processStat === null) return null;
  return boot + (Number(processStat.startTime) / USER_HZ) * SECOND_MS;
}

export function parseBootTime(procStat: string): number | null {
  const seconds: string | undefined = BOOT_TIME_LINE.exec(procStat)?.[1];
  return seconds === undefined ? null : Number(seconds) * SECOND_MS;
}

// The boot time never changes while Orbit runs, so it is read once.
function bootTime(): Promise<number | null> {
  bootTimeMs ??= readFile('/proc/stat', 'utf8').then(parseBootTime, (): null => null);
  return bootTimeMs;
}
