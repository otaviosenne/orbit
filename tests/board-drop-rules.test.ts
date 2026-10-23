import { describe, expect, it } from 'vitest';
import type { BoardZone, DragSource, DropAction } from '../src/renderer/board/drop-rules';
import { dropActionFor, dropHint, isZoneInPlay } from '../src/renderer/board/drop-rules';
import type { ColumnKey } from '../src/renderer/views/board-columns';

const COLUMNS: readonly ColumnKey[] = ['needs', 'busy', 'active', 'idle'];
const ZONES: readonly BoardZone[] = ['pinned', 'columns', ...COLUMNS, 'suspended'];
const NONE: DropAction = { kind: 'none' };

function fromColumn(column: ColumnKey, isPinned: boolean = false): DragSource {
  return { zone: column, isPinned, canSuspend: true };
}

const FROM_PINNED_ROW: DragSource = { zone: 'pinned', isPinned: true, canSuspend: true };
const FROM_CLOSED_PIN: DragSource = { zone: 'pinned', isPinned: true, canSuspend: false };
const FROM_SUSPENDED: DragSource = { zone: 'suspended', isPinned: false, canSuspend: false };

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

  it('reorders when a card is dropped in the section it came from', () => {
    expect(dropActionFor(FROM_PINNED_ROW, 'pinned')).toEqual({ kind: 'reorder', zone: 'pinned', target: null });
    expect(dropActionFor(FROM_SUSPENDED, 'suspended')).toEqual({ kind: 'reorder', zone: 'suspended', target: null });
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(fromColumn(column), column)).toEqual({ kind: 'reorder', zone: column, target: null }));
  });

  it('never moves a chat into Needs you or Working, which follow its live state', () => {
    COLUMNS.forEach((column: ColumnKey) => {
      if (column !== 'needs') expect(dropActionFor(fromColumn(column), 'needs')).toEqual(NONE);
      if (column !== 'busy') expect(dropActionFor(fromColumn(column), 'busy')).toEqual(NONE);
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

describe('suspending by drag', () => {
  it('suspends any open chat dropped on Suspended, from a column or the Pinned row', () => {
    COLUMNS.forEach((column: ColumnKey) => expect(dropActionFor(fromColumn(column), 'suspended')).toEqual({ kind: 'suspend' }));
    expect(dropActionFor(fromColumn('busy', true), 'suspended')).toEqual({ kind: 'suspend' });
    expect(dropActionFor(FROM_PINNED_ROW, 'suspended')).toEqual({ kind: 'suspend' });
  });

  it('does not suspend a closed pin (no process to close), nor anything where suspending is not offered', () => {
    expect(dropActionFor(FROM_CLOSED_PIN, 'suspended')).toEqual(NONE);
    expect(dropActionFor({ zone: 'idle', isPinned: false, canSuspend: false }, 'suspended')).toEqual(NONE);
    expect(dropActionFor(FROM_CLOSED_PIN, 'columns')).toEqual({ kind: 'unpin' });
  });

  it('does nothing with a suspended card dropped outside Suspended, and reorders it inside', () => {
    ZONES.filter((zone: BoardZone) => zone !== 'suspended').forEach((zone: BoardZone) => expect(dropActionFor(FROM_SUSPENDED, zone)).toEqual(NONE));
    expect(dropActionFor(FROM_SUSPENDED, 'suspended')).toEqual({ kind: 'reorder', zone: 'suspended', target: null });
  });
});

describe('isZoneInPlay', () => {
  it('offers a Pinned row card only Pinned, the whole columns area and Suspended', () => {
    const inPlay: BoardZone[] = ZONES.filter((zone: BoardZone) => isZoneInPlay(FROM_PINNED_ROW, zone));
    expect(inPlay).toEqual(['pinned', 'columns', 'suspended']);
  });

  it('offers a closed pin only Pinned and the whole columns area', () => {
    const inPlay: BoardZone[] = ZONES.filter((zone: BoardZone) => isZoneInPlay(FROM_CLOSED_PIN, zone));
    expect(inPlay).toEqual(['pinned', 'columns']);
  });

  it('offers a column card Pinned, every single column and Suspended', () => {
    const inPlay: BoardZone[] = ZONES.filter((zone: BoardZone) => isZoneInPlay(fromColumn('idle'), zone));
    expect(inPlay).toEqual(['pinned', ...COLUMNS, 'suspended']);
  });

  it('offers a suspended card only its own section, so no other zone lights up or fades', () => {
    expect(ZONES.filter((zone: BoardZone) => isZoneInPlay(FROM_SUSPENDED, zone))).toEqual(['suspended']);
  });
});

describe('dropHint', () => {
  it('says what a drop does, and nothing for a drop that does nothing', () => {
    expect(dropHint({ kind: 'pin' })).toBe('Pin');
    expect(dropHint({ kind: 'unpin' })).toBe('Unpin');
    expect(dropHint({ kind: 'rest', column: 'active' })).toBe('Move here');
    expect(dropHint({ kind: 'suspend' })).toBe('Suspend');
    expect(dropHint(NONE)).toBeNull();
  });
});
