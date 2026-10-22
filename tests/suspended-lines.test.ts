import { describe, expect, it } from 'vitest';
import { cardsPerLineOf, suspendedScrolls } from '../src/renderer/board/suspended-lines';

describe('suspendedScrolls', () => {
  it('wraps into two lines while every card fits', () => {
    expect(suspendedScrolls(4, 4)).toBe(false);
    expect(suspendedScrolls(6, 4)).toBe(false);
    expect(suspendedScrolls(8, 4)).toBe(false);
  });

  it('scrolls sideways once two lines are full', () => {
    expect(suspendedScrolls(9, 4)).toBe(true);
  });
});

describe('cardsPerLineOf', () => {
  it('counts the cards that fit with their gaps, at least one', () => {
    expect(cardsPerLineOf(1000, 250, 8)).toBe(3);
    expect(cardsPerLineOf(100, 250, 8)).toBe(1);
  });
});
