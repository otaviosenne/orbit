import type { ProcessSample } from './process-sample';

// smaps_rollup makes the kernel walk a process's page tables, about 5 ms for a large node process, while memory
// moves slowly; each process's PSS is re-read at most this often, so the CPU column can still refresh every poll.
export const MEMORY_REFRESH_MS: number = 10_000;

interface MemoryEntry {
  readonly startTime: string;
  readonly bytes: number;
  readonly readAt: number;
}

export type MemoryReader = (pids: readonly number[]) => Promise<number[]>;

// The last PSS read of every process in a chat tree. Rebuilt on each update from the processes passed in, which
// drops the ones that died or left the trees.
export class MemoryBook {
  private entries: ReadonlyMap<number, MemoryEntry> = new Map();

  constructor(private readonly read: MemoryReader) {}

  async update(samples: readonly ProcessSample[], now: number): Promise<void> {
    const stale: ProcessSample[] = samples.filter((sample: ProcessSample) => this.isStale(sample, now));
    const bytes: number[] = await this.read(stale.map((sample: ProcessSample) => sample.pid));
    const next: Map<number, MemoryEntry> = new Map();
    for (const sample of samples) {
      const kept: MemoryEntry | undefined = this.entries.get(sample.pid);
      if (kept !== undefined && !this.isStale(sample, now)) next.set(sample.pid, kept);
    }
    stale.forEach((sample: ProcessSample, index: number): void => {
      next.set(sample.pid, { startTime: sample.startTime, bytes: bytes[index] ?? 0, readAt: now });
    });
    this.entries = next;
  }

  total(pids: readonly number[]): number {
    return pids.reduce((sum: number, pid: number) => sum + (this.entries.get(pid)?.bytes ?? 0), 0);
  }

  private isStale(sample: ProcessSample, now: number): boolean {
    const entry: MemoryEntry | undefined = this.entries.get(sample.pid);
    return entry === undefined || entry.startTime !== sample.startTime || now - entry.readAt >= MEMORY_REFRESH_MS;
  }
}
