import { describe, expect, it } from 'vitest';
import { weeklyLevel } from '../src/renderer/usage/weekly-level';

describe('weeklyLevel', () => {
  it('stays neutral below half the week', () => {
    expect(weeklyLevel(0)).toBe('calm');
    expect(weeklyLevel(49)).toBe('calm');
  });

  it('warns from 50%, turns critical from 70% and exhausted from 90%', () => {
    expect(weeklyLevel(50)).toBe('warning');
    expect(weeklyLevel(69)).toBe('warning');
    expect(weeklyLevel(70)).toBe('critical');
    expect(weeklyLevel(89)).toBe('critical');
    expect(weeklyLevel(90)).toBe('exhausted');
    expect(weeklyLevel(100)).toBe('exhausted');
  });
});
