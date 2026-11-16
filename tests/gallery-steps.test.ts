import { describe, expect, it } from 'vitest';
import { counterText, steppedIndex, SWIPE_MIN_PX, swipeStep, totalText } from '../src/renderer/gallery-steps';

describe('steppedIndex', () => {
  it('moves one picture either way', () => {
    expect(steppedIndex(1, 1, 4)).toBe(2);
    expect(steppedIndex(1, -1, 4)).toBe(0);
  });

  it('stops at both ends instead of wrapping', () => {
    expect(steppedIndex(0, -1, 4)).toBe(0);
    expect(steppedIndex(3, 1, 4)).toBe(3);
  });

  it('pulls an index past the end back onto the last picture', () => {
    expect(steppedIndex(9, 0, 3)).toBe(2);
  });
});

describe('swipeStep', () => {
  it('turns a left swipe into the next picture and a right swipe into the previous one', () => {
    expect(swipeStep(-SWIPE_MIN_PX)).toBe(1);
    expect(swipeStep(SWIPE_MIN_PX + 1)).toBe(-1);
  });

  it('ignores a tap that barely moved', () => {
    expect(swipeStep(SWIPE_MIN_PX - 1)).toBe(0);
    expect(swipeStep(-3)).toBe(0);
  });
});

describe('counterText', () => {
  it('counts from one', () => {
    expect(counterText(0, 5)).toBe('1 / 5');
  });

  it('names the total in the grid', () => {
    expect(totalText(5)).toBe('5 images');
  });
});
