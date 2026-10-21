import { describe, expect, it } from 'vitest';
import type { BoardZone, DragSource, DropAction } from '../src/renderer/board/drop-rules';
import { dropActionFor, dropHint, isZoneInPlay } from '../src/renderer/board/drop-rules';
import type { ColumnKey } from '../src/renderer/views/board-columns';

const COLUMNS: readonly ColumnKey[] = ['needs', 'busy', 'active', 'idle'];
const ZONES: readonly BoardZone[] = ['pinned', 'columns', ...COLUMNS];
const NONE: DropAction = { kind: 'none' };

function fromColumn(column: ColumnKey, isPinned: boolean = false): DragSource {
  return { zone: column, isPinned };
}

const FROM_PINNED_ROW: DragSource = { zone: 'pinned', isPinned: true };

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
    expect(dropActionFor(FROM_PINNED_ROW, 'pinned')).toEqual(NONE);
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(fromColumn(column), column)).toEqual(NONE));
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

  it('only unpins a Pinned row card dropped anywhere on the columns area', () => {
    expect(dropActionFor(FROM_PINNED_ROW, 'columns')).toEqual({ kind: 'unpin' });
  });

  it('ignores the single columns for a Pinned row card, so it never rests or lights them up', () => {
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(FROM_PINNED_ROW, column)).toEqual(NONE));
  });

  it('ignores the columns area for a column card, which keeps the per-column zones', () => {
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(fromColumn(column), 'columns')).toEqual(NONE));
  });
});

describe('isZoneInPlay', () => {
  it('offers a Pinned row card only Pinned and the whole columns area', () => {
    const inPlay: BoardZone[] = ZONES.filter((zone: BoardZone) => isZoneInPlay(FROM_PINNED_ROW, zone));
    expect(inPlay).toEqual(['pinned', 'columns']);
  });

  it('offers a column card Pinned and every single column', () => {
    const inPlay: BoardZone[] = ZONES.filter((zone: BoardZone) => isZoneInPlay(fromColumn('idle'), zone));
    expect(inPlay).toEqual(['pinned', ...COLUMNS]);
  });
});

describe('dropHint', () => {
  it('says what a drop does, and nothing for a drop that does nothing', () => {
    expect(dropHint({ kind: 'pin' })).toBe('Pin');
    expect(dropHint({ kind: 'unpin' })).toBe('Unpin');
    expect(dropHint({ kind: 'rest', column: 'active' })).toBe('Move here');
    expect(dropHint(NONE)).toBeNull();
  });
});
