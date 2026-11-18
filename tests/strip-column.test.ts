import { describe, expect, it } from 'vitest';
import { visibleRows } from '../src/renderer/sheet/strip-column';

describe('visibleRows', () => {
  it('on a phone shows a lone row and folds two or more entirely', () => {
    expect(visibleRows(1, true)).toBe(1);
    expect(visibleRows(2, true)).toBe(0);
    expect(visibleRows(5, true)).toBe(0);
  });

  it('on the desktop keeps the first three', () => {
    expect(visibleRows(2, false)).toBe(2);
    expect(visibleRows(5, false)).toBe(3);
  });
});
