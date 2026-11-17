import { describe, expect, it } from 'vitest';
import type { NightWindow } from '../src/shared/night-shutdown';
import { holdUntilFor, isStartChoice, startChoices, tonightStartHour } from '../src/shared/night-shutdown';

const WINDOW: NightWindow = { startHour: 22, endHour: 6 };

function at(day: number, hour: number, minute: number = 0): Date {
  return new Date(2026, 10, day, hour, minute, 0, 0);
}

describe('startChoices', () => {
  it('runs from the usual start through midnight to the morning end', () => {
    expect(startChoices(WINDOW)).toEqual([22, 23, 0, 1, 2, 3, 4, 5, 6]);
  });

  it('accepts only those hours', () => {
    expect(isStartChoice(0, WINDOW)).toBe(true);
    expect(isStartChoice(12, WINDOW)).toBe(false);
    expect(isStartChoice('0', WINDOW)).toBe(false);
  });
});

describe('holdUntilFor', () => {
  it('in the afternoon, holds tonight until midnight or the morning', () => {
    expect(holdUntilFor(0, WINDOW, at(17, 15))).toBe(at(18, 0).getTime());
    expect(holdUntilFor(23, WINDOW, at(17, 15))).toBe(at(17, 23).getTime());
    expect(holdUntilFor(6, WINDOW, at(17, 15))).toBe(at(18, 6).getTime());
  });

  it('after midnight, the night began yesterday', () => {
    expect(holdUntilFor(3, WINDOW, at(18, 1, 30))).toBe(at(18, 3).getTime());
    expect(holdUntilFor(6, WINDOW, at(18, 1, 30))).toBe(at(18, 6).getTime());
  });

  it('has nothing to hold for the usual start or an hour already past', () => {
    expect(holdUntilFor(22, WINDOW, at(17, 15))).toBeNull();
    expect(holdUntilFor(0, WINDOW, at(18, 1, 30))).toBeNull();
  });
});

describe('tonightStartHour', () => {
  it('reads a live hold back as its hour, and an ended one as the usual start', () => {
    const now: number = at(17, 15).getTime();
    expect(tonightStartHour(at(18, 0).getTime(), WINDOW, now)).toBe(0);
    expect(tonightStartHour(at(18, 6).getTime(), WINDOW, now)).toBe(6);
    expect(tonightStartHour(at(17, 6).getTime(), WINDOW, now)).toBe(22);
    expect(tonightStartHour(null, WINDOW, now)).toBe(22);
  });
});
