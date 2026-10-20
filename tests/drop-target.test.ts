import { describe, expect, it } from 'vitest';
import type { SlotRect } from '../src/renderer/views/grid/drop-target';
import { dropIndexAt } from '../src/renderer/views/grid/drop-target';

// Two columns, two rows of 100 × 100 slots with a 10 px gap.
const SLOTS: SlotRect[] = [
  { left: 0, top: 0, right: 100, bottom: 100 },
  { left: 110, top: 0, right: 210, bottom: 100 },
  { left: 0, top: 110, right: 100, bottom: 210 },
  { left: 110, top: 110, right: 210, bottom: 210 },
];

describe('dropIndexAt', () => {
  it('picks the slot under the pointer', () => {
    expect(dropIndexAt(SLOTS, { x: 150, y: 150 })).toBe(3);
    expect(dropIndexAt(SLOTS, { x: 10, y: 120 })).toBe(2);
  });

  it('picks the nearest slot from a gap or past the last row', () => {
    expect(dropIndexAt(SLOTS, { x: 104, y: 40 })).toBe(0);
    expect(dropIndexAt(SLOTS, { x: 160, y: 400 })).toBe(3);
  });

  it('has no answer without slots', () => {
    expect(dropIndexAt([], { x: 0, y: 0 })).toBeNull();
  });
});
