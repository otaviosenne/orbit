import { describe, expect, it } from 'vitest';
import { paceScore, weeklyLevel } from '../src/renderer/usage/weekly-level';

describe('weeklyLevel', () => {
  it('is green well below the even pace and neutral close to it, on either side', () => {
    expect(weeklyLevel(30, 50)).toBe('low');
    expect(weeklyLevel(40, 50)).toBe('ok');
    expect(weeklyLevel(50, 50)).toBe('ok');
    expect(weeklyLevel(55, 50)).toBe('ok');
  });

  it('turns yellow, red and purple as the usage eats the room above the pace', () => {
    expect(weeklyLevel(60, 50)).toBe('warning');
    expect(weeklyLevel(70, 50)).toBe('critical');
    expect(weeklyLevel(90, 50)).toBe('exhausted');
  });

  it('judges a lead by the room that is left, not by points', () => {
    expect(weeklyLevel(15, 10)).toBe('ok');
    expect(weeklyLevel(95, 90)).toBe('critical');
    expect(weeklyLevel(99, 90)).toBe('exhausted');
  });

  it('copes with an empty or full pace', () => {
    expect(paceScore(0, 0)).toBe(0);
    expect(weeklyLevel(5, 0)).toBe('ok');
    expect(weeklyLevel(100, 100)).toBe('exhausted');
    expect(weeklyLevel(70, 100)).toBe('low');
  });
});
