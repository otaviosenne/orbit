import { describe, expect, it } from 'vitest';
import { nextInCycle, steppedRange } from '../src/renderer/shortcuts/bindings/timeline-bindings';
import type { TimelineRange } from '../src/renderer/views/timeline-range';
import { TIMELINE_RANGES } from '../src/renderer/views/timeline-range';

const SHORTEST: TimelineRange = TIMELINE_RANGES[0] ?? '1h';
const LONGEST: TimelineRange = TIMELINE_RANGES.at(-1) ?? '6h';

describe('timeline shortcuts', () => {
  it('flip a two-way switch', () => {
    expect(nextInCycle(['bars', 'lines'], 'bars')).toBe('lines');
    expect(nextInCycle(['bars', 'lines'], 'lines')).toBe('bars');
  });

  it('step the range and hold at its ends', () => {
    expect(steppedRange('1h', 1)).toBe('2h');
    expect(steppedRange('2h', -1)).toBe('1h');
    expect(steppedRange(LONGEST, 1)).toBe(LONGEST);
    expect(steppedRange(SHORTEST, -1)).toBe(SHORTEST);
  });
});
