import { describe, expect, it } from 'vitest';
import type { MemoryReader } from '../src/core/resources/memory-book';
import { MEMORY_REFRESH_MS, MemoryBook } from '../src/core/resources/memory-book';
import type { ProcessSample } from '../src/core/resources/process-sample';

function sample(pid: number, startTime: string = `t${pid}`): ProcessSample {
  return { pid, parentPid: 1, startTime, cpuTicks: 0 };
}

// Hands out a new size on every read, so a test can tell a cached value from a fresh one.
interface CountingReader {
  readonly read: MemoryReader;
  readonly asked: number[][];
}

function countingReader(): CountingReader {
  const asked: number[][] = [];
  let next: number = 0;
  return {
    asked,
    read: (pids: readonly number[]): Promise<number[]> => {
      asked.push([...pids]);
      return Promise.resolve(pids.map((): number => (next += 100)));
    },
  };
}

describe('MemoryBook', () => {
  it('reads new processes at once and keeps recent reads', async () => {
    const reader: CountingReader = countingReader();
    const book: MemoryBook = new MemoryBook(reader.read);
    await book.update([sample(1), sample(2)], 0);
    await book.update([sample(1), sample(2), sample(3)], 2000);
    expect(reader.asked).toEqual([[1, 2], [3]]);
    expect(book.total([1, 2, 3])).toBe(100 + 200 + 300);
  });

  it('re-reads once a read is old, and when a pid was reused', async () => {
    const reader: CountingReader = countingReader();
    const book: MemoryBook = new MemoryBook(reader.read);
    await book.update([sample(1), sample(2)], 0);
    await book.update([sample(1), sample(2, 'reused')], 1000);
    await book.update([sample(1), sample(2, 'reused')], MEMORY_REFRESH_MS);
    expect(reader.asked).toEqual([[1, 2], [2], [1]]);
  });

  it('forgets processes that are gone', async () => {
    const reader: CountingReader = countingReader();
    const book: MemoryBook = new MemoryBook(reader.read);
    await book.update([sample(1), sample(2)], 0);
    await book.update([sample(1)], 1000);
    expect(book.total([1, 2])).toBe(100);
  });
});
