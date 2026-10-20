import { TAIL_GROWTH_FACTOR, TRANSCRIPT_TAIL_INITIAL_BYTES, TRANSCRIPT_TAIL_MAX_BYTES } from './config';
import { readTail } from './file-reader';
import type { TailText } from './file-reader';

export interface TailSearchResult<T> {
  readonly value: T;
  readonly satisfied: boolean;
}

export type TailSearch<T> = (text: string) => TailSearchResult<T>;

// Reads a growing window from the end of the file until the search is satisfied or the cap is hit.
export async function searchTail<T>(path: string, search: TailSearch<T>): Promise<T> {
  let windowBytes: number = TRANSCRIPT_TAIL_INITIAL_BYTES;
  for (;;) {
    const tail: TailText = await readTail(path, windowBytes);
    const result: TailSearchResult<T> = search(tail.text);
    if (result.satisfied || tail.reachedStart || windowBytes >= TRANSCRIPT_TAIL_MAX_BYTES) return result.value;
    windowBytes *= TAIL_GROWTH_FACTOR;
  }
}
