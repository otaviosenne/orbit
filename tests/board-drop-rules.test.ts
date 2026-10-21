import { describe, expect, it } from 'vitest';
import type { BoardZone, DragSource, DropAction } from '../src/renderer/board/drop-rules';
import { dropActionFor, dropHint } from '../src/renderer/board/drop-rules';
import type { ColumnKey } from '../src/renderer/views/board-columns';

const COLUMNS: readonly ColumnKey[] = ['needs', 'busy', 'active', 'idle'];
const NONE: DropAction = { kind: 'none' };

function fromColumn(column: ColumnKey, isPinned: boolean = false): DragSource {
  return { zone: column, column, isPinned };
}

function fromPinnedRow(column: ColumnKey | null): DragSource {
  return { zone: 'pinned', column, isPinned: true };
}

describe('dropActionFor', () => {
  it('moves a resting chat between Active and Idle', () => {
    expect(dropActionFor(fromColumn('active'), 'idle')).toEqual({ kind: 'rest', column: 'idle' });
    expect(dropActionFor(fromColumn('idle'), 'active')).toEqual({ kind: 'rest', column: 'active' });
  });

  it('pins any chat that is not pinned yet when dropped on Pinned', () => {
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(fromColumn(column), 'pinned')).toEqual({ kind: 'pin' }));
  });

  it('does nothing when the column card of a pinned chat is dropped on Pinned', () => {
    expect(dropActionFor(fromColumn('active', true), 'pinned')).toEqual(NONE);
  });

  it('does nothing when a card goes back to the zone it came from', () => {
    const zones: readonly BoardZone[] = ['pinned', ...COLUMNS];
    zones.forEach((zone: BoardZone) => expect(dropActionFor({ zone, column: zone === 'pinned' ? 'idle' : zone, isPinned: zone === 'pinned' }, zone)).toEqual(NONE));
  });

  it('never moves a chat into Needs you or Working, which follow its live state', () => {
    COLUMNS.forEach((column: ColumnKey) => {
      expect(dropActionFor(fromColumn(column), 'needs')).toEqual(NONE);
      expect(dropActionFor(fromColumn(column), 'busy')).toEqual(NONE);
    });
  });

  it('does not rest a chat that needs you or is working, since it would not stay put', () => {
    expect(dropActionFor(fromColumn('needs'), 'active')).toEqual(NONE);
    expect(dropActionFor(fromColumn('busy'), 'idle')).toEqual(NONE);
  });

  it('unpins a Pinned row card and rests it when its chat is resting elsewhere', () => {
    expect(dropActionFor(fromPinnedRow('active'), 'idle')).toEqual({ kind: 'unpin', rest: 'idle' });
    expect(dropActionFor(fromPinnedRow('idle'), 'active')).toEqual({ kind: 'unpin', rest: 'active' });
  });

  it('only unpins a Pinned row card dropped on its own column', () => {
    expect(dropActionFor(fromPinnedRow('active'), 'active')).toEqual({ kind: 'unpin', rest: null });
  });

  it('only unpins a Pinned row card whose chat needs you or is working', () => {
    expect(dropActionFor(fromPinnedRow('needs'), 'active')).toEqual({ kind: 'unpin', rest: null });
    expect(dropActionFor(fromPinnedRow('busy'), 'idle')).toEqual({ kind: 'unpin', rest: null });
  });

  it('only unpins a Pinned row card dropped on Needs you or Working', () => {
    expect(dropActionFor(fromPinnedRow('active'), 'needs')).toEqual({ kind: 'unpin', rest: null });
    expect(dropActionFor(fromPinnedRow('idle'), 'busy')).toEqual({ kind: 'unpin', rest: null });
  });

  it('only unpins a closed pinned chat, wherever it is dropped', () => {
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(fromPinnedRow(null), column)).toEqual({ kind: 'unpin', rest: null }));
  });
});

describe('dropHint', () => {
  it('says what a drop does, and nothing for a drop that does nothing', () => {
    expect(dropHint({ kind: 'pin' })).toBe('Pin');
    expect(dropHint({ kind: 'unpin', rest: null })).toBe('Unpin');
    expect(dropHint({ kind: 'unpin', rest: 'idle' })).toBe('Unpin and move here');
    expect(dropHint({ kind: 'rest', column: 'active' })).toBe('Move here');
    expect(dropHint(NONE)).toBeNull();
  });
});
