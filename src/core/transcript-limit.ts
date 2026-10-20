import { TRANSCRIPT_ITEM_LIMIT, TRANSCRIPT_PAGE_MAX } from './config';

// The renderer's page size arrives over IPC; anything but a positive whole number gets the usual amount.
export function transcriptLimit(requested: unknown): number {
  if (typeof requested !== 'number' || !Number.isInteger(requested) || requested < 1) return TRANSCRIPT_ITEM_LIMIT;
  return Math.min(requested, TRANSCRIPT_PAGE_MAX);
}
