import { beforeEach, describe, expect, it } from 'vitest';
import { GridLayoutStore } from '../src/renderer/views/grid/grid-layout-store';
import { DEFAULT_GRID_STATE } from '../src/renderer/views/grid/grid-state';

describe('GridLayoutStore', () => {
  let stored: string | null;

  beforeEach(() => {
    stored = null;
    globalThis.localStorage = {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    } as unknown as Storage;
  });

  it('starts as a 2 × 2 grid with no chats', () => {
    expect(new GridLayoutStore().state).toEqual(DEFAULT_GRID_STATE);
  });

  it('remembers chats, their order and the layout', () => {
    const store: GridLayoutStore = new GridLayoutStore();
    store.toggle('a');
    store.toggle('b');
    store.move('b', 'a');
    store.setColumns(3);
    store.setRows(3);
    expect(new GridLayoutStore().state).toEqual({ order: ['b', 'a'], columns: 3, rows: 3 });
  });

  it('remembers a single column and a single row', () => {
    const store: GridLayoutStore = new GridLayoutStore();
    store.setColumns(1);
    store.setRows(1);
    expect(new GridLayoutStore().state).toMatchObject({ columns: 1, rows: 1 });
  });

  it('ignores a stored value that is not JSON', () => {
    stored = '{broken';
    expect(new GridLayoutStore().state).toEqual(DEFAULT_GRID_STATE);
  });

  it('keeps working when storage throws', () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => {
        throw new Error('unavailable');
      },
    } as unknown as Storage;
    const store: GridLayoutStore = new GridLayoutStore();
    store.toggle('a');
    expect(store.has('a')).toBe(true);
  });
});
