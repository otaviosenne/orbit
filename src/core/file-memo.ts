import { stat } from 'node:fs/promises';
import type { Stats } from 'node:fs';

interface MemoEntry<T> {
  readonly version: string;
  readonly value: T;
}

// Whether a value cached for the file's current version still answers this call (a call may need more of the file).
export type CoversCall<T> = (value: T) => boolean;

// Recomputes a per-file value only when the file's size or mtime changed.
export class FileMemo<T> {
  private readonly entries: Map<string, MemoEntry<T>> = new Map();

  async get(path: string, compute: () => Promise<T>, covers: CoversCall<T> = (): boolean => true): Promise<T> {
    const stats: Stats = await stat(path);
    const version: string = `${stats.mtimeMs}:${stats.size}`;
    const cached: MemoEntry<T> | undefined = this.entries.get(path);
    if (cached !== undefined && cached.version === version && covers(cached.value)) return cached.value;
    const value: T = await compute();
    this.entries.set(path, { version, value });
    return value;
  }
}
