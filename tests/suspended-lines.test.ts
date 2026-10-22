import { describe, expect, it } from 'vitest';
import { cardsPerLineOf, suspendedLines } from '../src/renderer/board/suspended-lines';

describe('suspendedLines', () => {
  it('uses one line while every card fits side by side', () => {
    expect(suspendedLines(4, 5)).toBe(1);
  });

  it('adds a second line when they do not, and never a third', () => {
    expect(suspendedLines(6, 5)).toBe(2);
    expect(suspendedLines(40, 5)).toBe(2);
  });

  it('handles an empty or unmeasured row', () => {
    expect(suspendedLines(0, 5)).toBe(1);
    expect(suspendedLines(3, 0)).toBe(1);
  });
});

describe('cardsPerLineOf', () => {
  it('counts the cards that fit with their gaps, at least one', () => {
    expect(cardsPerLineOf(1000, 250, 8)).toBe(3);
    expect(cardsPerLineOf(100, 250, 8)).toBe(1);
  });
});
