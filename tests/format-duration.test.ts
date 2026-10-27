import { describe, expect, it } from 'vitest';
import { formatDuration } from '../src/renderer/format';

const SECOND: number = 1000;
const MINUTE: number = 60 * SECOND;
const HOUR: number = 60 * MINUTE;
const DAY: number = 24 * HOUR;

describe('formatDuration', () => {
  it('counts seconds, minutes, hours, days and then weeks', () => {
    expect(formatDuration(45 * SECOND)).toBe('45s');
    expect(formatDuration(12 * MINUTE)).toBe('12m');
    expect(formatDuration(2 * HOUR + 5 * MINUTE)).toBe('2h 05m');
    expect(formatDuration(3 * DAY + 4 * HOUR)).toBe('3d 4h');
    expect(formatDuration(16 * DAY)).toBe('2w 2d');
  });
});
