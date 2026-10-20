import { describe, expect, it } from 'vitest';
import { clipSpans, mergeSpans } from '../src/shared/time-span';

describe('mergeSpans', () => {
  it('joins overlapping and touching spans and keeps gaps apart', () => {
    expect(mergeSpans([{ start: 50, end: 60 }, { start: 0, end: 10 }, { start: 10, end: 20 }, { start: 15, end: 30 }])).toEqual([
      { start: 0, end: 30 },
      { start: 50, end: 60 },
    ]);
  });
});

describe('clipSpans', () => {
  const window = { start: 100, end: 200 };

  it('cuts spans that cross the window edges', () => {
    expect(clipSpans([{ start: 50, end: 120 }, { start: 180, end: 250 }], window)).toEqual([
      { start: 100, end: 120 },
      { start: 180, end: 200 },
    ]);
  });

  it('drops spans entirely before or after the window, and ones that only touch it', () => {
    expect(clipSpans([{ start: 0, end: 50 }, { start: 50, end: 100 }, { start: 210, end: 300 }], window)).toEqual([]);
  });

  it('keeps spans inside the window unchanged', () => {
    expect(clipSpans([{ start: 120, end: 150 }], window)).toEqual([{ start: 120, end: 150 }]);
  });
});
