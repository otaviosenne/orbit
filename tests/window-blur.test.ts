import { describe, expect, it } from 'vitest';
import { isWindowBlur } from '../src/renderer/board/window-blur';

const field = {} as Element;
const other = {} as Element;

describe('isWindowBlur', () => {
  it('is a window blur when the field is still the active element but the window lost focus', () => {
    expect(isWindowBlur(field, field, false)).toBe(true);
  });

  it('is not one when the window has focus, as when the person clicks elsewhere or presses Enter', () => {
    expect(isWindowBlur(field, other, true)).toBe(false);
    expect(isWindowBlur(field, null, true)).toBe(false);
  });
});
