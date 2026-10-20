import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';

export interface TailText {
  readonly text: string;
  readonly reachedStart: boolean;
}

export interface RangeText {
  readonly text: string;
  readonly consumedBytes: number;
}

const NEWLINE: string = '\n';

export async function readTail(path: string, maxBytes: number): Promise<TailText> {
  return withFile(path, async (handle: FileHandle): Promise<TailText> => {
    const { size } = await handle.stat();
    const start: number = Math.max(0, size - maxBytes);
    const text: string = await readRange(handle, start, size - start);
    return { text: start === 0 ? text : dropFirstLine(text), reachedStart: start === 0 };
  });
}

export async function readHead(path: string, maxBytes: number): Promise<string> {
  return withFile(path, async (handle: FileHandle): Promise<string> => {
    const { size } = await handle.stat();
    return readRange(handle, 0, Math.min(size, maxBytes));
  });
}

// Returns only complete lines, so a line still being written is picked up on the next read.
export async function readCompleteLinesFrom(path: string, offset: number): Promise<RangeText> {
  return withFile(path, async (handle: FileHandle): Promise<RangeText> => {
    const { size } = await handle.stat();
    if (size <= offset) return { text: '', consumedBytes: 0 };
    const buffer: Buffer = Buffer.alloc(size - offset);
    await handle.read(buffer, 0, buffer.length, offset);
    const lastNewline: number = buffer.lastIndexOf(NEWLINE);
    if (lastNewline === -1) return { text: '', consumedBytes: 0 };
    return { text: buffer.subarray(0, lastNewline).toString('utf8'), consumedBytes: lastNewline + 1 };
  });
}

export async function fileSize(path: string): Promise<number> {
  return withFile(path, async (handle: FileHandle): Promise<number> => (await handle.stat()).size);
}

async function withFile<T>(path: string, use: (handle: FileHandle) => Promise<T>): Promise<T> {
  const handle: FileHandle = await open(path, 'r');
  try {
    return await use(handle);
  } finally {
    await handle.close();
  }
}

async function readRange(handle: FileHandle, start: number, length: number): Promise<string> {
  const buffer: Buffer = Buffer.alloc(length);
  await handle.read(buffer, 0, length, start);
  return buffer.toString('utf8');
}

function dropFirstLine(text: string): string {
  const firstNewline: number = text.indexOf(NEWLINE);
  return firstNewline === -1 ? '' : text.slice(firstNewline + 1);
}
