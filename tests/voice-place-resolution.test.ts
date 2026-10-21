import { describe, expect, it } from 'vitest';
import { resolvePlace } from '../src/renderer/sheet/voice/place-resolution';
import { nextFocusedTile } from '../src/renderer/views/grid/tile-focus';

const drawer: string = 'side panel composer';
const tile: string = 'focused tile composer';

describe('resolvePlace', () => {
  it('follows the side panel while the Panel is not on screen', () => {
    expect(resolvePlace({ surface: 'drawer', drawer, tile: null })).toBe(drawer);
    expect(resolvePlace({ surface: 'drawer', drawer: null, tile: null })).toBeNull();
  });

  it('ignores a tile left focused once the Panel is gone', () => {
    expect(resolvePlace({ surface: 'drawer', drawer: null, tile })).toBeNull();
    expect(resolvePlace({ surface: 'drawer', drawer, tile })).toBe(drawer);
  });

  it('follows the focused tile while the Panel is on screen', () => {
    expect(resolvePlace({ surface: 'panel', drawer: null, tile })).toBe(tile);
  });

  it('has no target in the Panel while no tile has focus, whatever the side panel held', () => {
    expect(resolvePlace({ surface: 'panel', drawer: null, tile: null })).toBeNull();
    expect(resolvePlace({ surface: 'panel', drawer, tile: null })).toBeNull();
  });
});

describe('nextFocusedTile', () => {
  it('moves to the tile whose composer has focus', () => {
    expect(nextFocusedTile('a', 'b', true)).toBe('b');
    expect(nextFocusedTile(null, 'a', true)).toBe('a');
    expect(nextFocusedTile('a', 'b', false)).toBe('b');
  });

  it('lets go when focus leaves the composers inside the window', () => {
    expect(nextFocusedTile('a', null, true)).toBeNull();
  });

  it('keeps the tile while another window has the focus', () => {
    expect(nextFocusedTile('a', null, false)).toBe('a');
    expect(nextFocusedTile(null, null, false)).toBeNull();
  });
});
