import { describe, expect, it } from 'vitest';
import { MIN_PICKER_COLUMNS, MIN_PICKER_LINES, pickerShrinkFactor } from '../src/core/questions/picker-fit';

describe('pickerShrinkFactor', () => {
  it('leaves a roomy terminal alone', () => {
    expect(pickerShrinkFactor({ columns: 120, lines: 40 })).toBe(1);
  });

  it('shrinks a tiny tiled window until both sides fit', () => {
    const factor: number = pickerShrinkFactor({ columns: 20, lines: 7 });
    expect(20 * factor).toBeGreaterThanOrEqual(MIN_PICKER_COLUMNS);
    expect(7 * factor).toBeGreaterThanOrEqual(MIN_PICKER_LINES);
  });

  it('caps the shrink so the text stays legible', () => {
    expect(pickerShrinkFactor({ columns: 2, lines: 1 })).toBe(6);
  });

  it('does nothing when the size is unknown', () => {
    expect(pickerShrinkFactor({ columns: 0, lines: 0 })).toBe(1);
  });
});
