import { describe, expect, it } from 'vitest';
import { TRANSCRIPT_ITEM_LIMIT, TRANSCRIPT_PAGE_MAX } from '../src/core/config';
import { transcriptLimit } from '../src/core/transcript-limit';

describe('transcriptLimit', () => {
  it('keeps a sensible page size', () => {
    expect(transcriptLimit(20)).toBe(20);
  });

  it('falls back to the usual amount for a missing or broken value', () => {
    for (const value of [undefined, null, '20', 0, -3, 2.5, Number.NaN]) expect(transcriptLimit(value)).toBe(TRANSCRIPT_ITEM_LIMIT);
  });

  it('caps a huge request', () => {
    expect(transcriptLimit(TRANSCRIPT_PAGE_MAX * 2)).toBe(TRANSCRIPT_PAGE_MAX);
  });
});
