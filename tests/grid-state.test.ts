import { describe, expect, it } from 'vitest';
import { DEFAULT_GRID_STATE, liveOrder, moveChat, parseGridState, toggleChat } from '../src/renderer/views/grid/grid-state';
import { autoLayout } from '../src/renderer/views/grid/grid-state';

describe('parseGridState', () => {
  it('reads a valid stored state', () => {
    expect(parseGridState({ order: ['a', 'b'], columns: 3, rows: 2 })).toEqual({ order: ['a', 'b'], columns: 3, rows: 2 });
  });

  it('falls back to the default for anything that is not an object', () => {
    expect(parseGridState(null)).toEqual(DEFAULT_GRID_STATE);
    expect(parseGridState('grid')).toEqual(DEFAULT_GRID_STATE);
  });

  it('replaces only the fields that are wrong', () => {
    expect(parseGridState({ order: 'a', columns: 4, rows: 3 })).toEqual({ order: [], columns: 2, rows: 3 });
  });

  it('accepts one column and one row', () => {
    expect(parseGridState({ order: [], columns: 1, rows: 1 })).toEqual({ order: [], columns: 1, rows: 1 });
  });

  it('rejects zero and fractional sizes', () => {
    expect(parseGridState({ order: [], columns: 0, rows: 2.5 })).toEqual({ order: [], columns: 2, rows: 2 });
  });

  it('drops ids that are not strings and repeated ids', () => {
    expect(parseGridState({ order: ['a', 1, 'b', 'a'], columns: 2, rows: 2 }).order).toEqual(['a', 'b']);
  });
});

describe('toggleChat', () => {
  it('adds a chat as the last tile', () => {
    expect(toggleChat(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a chat that is already in the grid', () => {
    expect(toggleChat(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});

describe('moveChat', () => {
  it('moves a tile up to the target place', () => {
    expect(moveChat(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('moves a tile down to the target place', () => {
    expect(moveChat(['a', 'b', 'c'], 'a', 'b')).toEqual(['b', 'a', 'c']);
    expect(moveChat(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('keeps a chat that is not live in the stored order', () => {
    const order: string[] = moveChat(['a', 'offline', 'b', 'c'], 'c', 'a');
    expect(order).toContain('offline');
    expect(liveOrder(order, new Set(['a', 'b', 'c']))).toEqual(['c', 'a', 'b']);
  });

  it('leaves the order alone for unknown ids or a drop on itself', () => {
    expect(moveChat(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
    expect(moveChat(['a', 'b'], 'a', 'a')).toEqual(['a', 'b']);
  });
});

describe('liveOrder', () => {
  it('skips chats that are not live and keeps the order', () => {
    expect(liveOrder(['c', 'gone', 'a'], new Set(['a', 'c']))).toEqual(['c', 'a']);
  });
});

describe('autoLayout', () => {
  it('grows columns before rows as tiles are added', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 9, 12].map((count: number) => autoLayout(count))).toEqual([
      { columns: 1, rows: 1 },
      { columns: 1, rows: 1 },
      { columns: 2, rows: 1 },
      { columns: 2, rows: 2 },
      { columns: 2, rows: 2 },
      { columns: 3, rows: 2 },
      { columns: 3, rows: 2 },
      { columns: 3, rows: 3 },
      { columns: 3, rows: 3 },
      { columns: 3, rows: 3 },
    ]);
  });
});
