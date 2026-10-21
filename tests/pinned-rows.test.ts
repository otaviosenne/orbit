import { describe, expect, it } from 'vitest';
import { pinnedRowsLimit } from '../src/renderer/board/pinned-rows';

describe('pinnedRowsLimit', () => {
  it('leaves one or two lines uncapped', () => {
    expect(pinnedRowsLimit([6, 6, 6], 2)).toBeNull();
    expect(pinnedRowsLimit([6, 6, 80, 80], 2)).toBeNull();
  });

  it('caps at the top of the third line', () => {
    expect(pinnedRowsLimit([6, 6, 80, 80, 160], 2)).toBe(160);
  });

  it('ignores sub-pixel differences within a line', () => {
    expect(pinnedRowsLimit([6, 6.4, 80.2, 79.8], 2)).toBeNull();
  });
});
