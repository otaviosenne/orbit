import { describe, expect, it } from 'vitest';
import { slotShift, targetIndex } from '../src/renderer/views/list/drop-slot';
import { rowKeyAction } from '../src/renderer/views/list/list-keys';
import type { RowKeyStroke } from '../src/renderer/views/list/list-keys';

// Four rows 60 px tall: their middles.
const MIDPOINTS: readonly number[] = [30, 90, 150, 210];

describe('where a dragged row lands', () => {
  it('stays put until its middle passes a neighbour’s', () => {
    expect(targetIndex(MIDPOINTS, 1, 90)).toBe(1);
    expect(targetIndex(MIDPOINTS, 1, 149)).toBe(1);
    expect(targetIndex(MIDPOINTS, 1, 151)).toBe(2);
    expect(targetIndex(MIDPOINTS, 1, 29)).toBe(0);
  });

  it('reaches either end', () => {
    expect(targetIndex(MIDPOINTS, 0, 500)).toBe(3);
    expect(targetIndex(MIDPOINTS, 3, -500)).toBe(0);
  });
});

describe('rows stepping aside', () => {
  it('closes the gap above when a row is dragged down', () => {
    expect([0, 1, 2, 3].map((index: number) => slotShift(index, 0, 2))).toEqual([0, -1, -1, 0]);
  });

  it('opens a gap when a row is dragged up', () => {
    expect([0, 1, 2, 3].map((index: number) => slotShift(index, 3, 1))).toEqual([0, 1, 1, 0]);
  });

  it('moves nothing while the row is over its own slot', () => {
    expect([0, 1, 2, 3].map((index: number) => slotShift(index, 2, 2))).toEqual([0, 0, 0, 0]);
  });
});

describe('keys on a focused row', () => {
  const stroke = (key: string, modifiers: Partial<RowKeyStroke> = {}): RowKeyStroke => ({
    key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers,
  });

  it('walks the rows with the arrows and moves the row with Alt held', () => {
    expect(rowKeyAction(stroke('ArrowDown'))).toEqual({ kind: 'focus', step: 1 });
    expect(rowKeyAction(stroke('ArrowUp', { altKey: true }))).toEqual({ kind: 'move', step: -1 });
  });

  it('leaves other keys and modifiers alone', () => {
    expect(rowKeyAction(stroke('Enter'))).toBeNull();
    expect(rowKeyAction(stroke('ArrowDown', { ctrlKey: true }))).toBeNull();
    expect(rowKeyAction(stroke('ArrowDown', { shiftKey: true }))).toBeNull();
  });
});
