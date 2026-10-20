import { describe, expect, it } from 'vitest';
import type { TimeWindow } from '../src/renderer/views/timeline-layout';
import { layoutLane, tickTimes, timelineWindow, toPercent } from '../src/renderer/views/timeline-layout';
import type { TimelineRange } from '../src/renderer/views/timeline-range';
import { TIMELINE_RANGES, rangeTickMs } from '../src/renderer/views/timeline-range';
import type { AgentSnapshot } from '../src/shared/types';

const MINUTE: number = 60_000;
const HOUR: number = 60 * MINUTE;
// The lookahead is 1/18 of the history: 10 minutes of a 3-hour window.
const HISTORY_PER_LOOKAHEAD: number = 18;
// Enough labels to read the time anywhere, few enough that they never collide.
const MIN_TICKS: number = 5;
const MAX_TICKS: number = 9;
const NOW: number = Date.parse('2026-10-20T12:00:00Z');

function agent(id: string, startMinutesAgo: number, endMinutesAgo: number | null): AgentSnapshot {
  return {
    id,
    description: id,
    agentType: 'general-purpose',
    state: endMinutesAgo === null ? 'running' : 'done',
    startedAt: NOW - startMinutesAgo * MINUTE,
    lastActivityAt: NOW,
    endedAt: endMinutesAgo === null ? null : NOW - endMinutesAgo * MINUTE,
  };
}

describe('layoutLane', () => {
  it('stacks overlapping agents and reuses a row once it is free', () => {
    const layout = layoutLane([agent('a', 60, 30), agent('b', 50, null), agent('c', 20, null)], timelineWindow(NOW, '3h'), NOW);
    expect(layout.bars.map((bar) => [bar.agent.id, bar.row])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 0],
    ]);
    expect(layout.rows).toBe(2);
  });

  it('drops agents that ended before the visible window', () => {
    expect(layoutLane([agent('old', 400, 300)], timelineWindow(NOW, '3h'), NOW).bars).toHaveLength(0);
  });
});

describe('toPercent', () => {
  it('clamps times outside the window to its edges', () => {
    const window = timelineWindow(NOW, '3h');
    expect(toPercent(window.start - MINUTE, window)).toBe(0);
    expect(toPercent(window.end + MINUTE, window)).toBe(100);
  });
});

describe('timelineWindow', () => {
  it.each([
    ['1h', 1],
    ['2h', 2],
    ['3h', 3],
    ['6h', 6],
  ] as [TimelineRange, number][])('reaches back %s with a proportionate lookahead', (range: TimelineRange, hours: number) => {
    const window: TimeWindow = timelineWindow(NOW, range);
    expect(window.start).toBe(NOW - hours * HOUR);
    expect(window.end).toBe(NOW + (hours * HOUR) / HISTORY_PER_LOOKAHEAD);
  });

  it('keeps the original 10 minutes of lookahead at 3h', () => {
    expect(timelineWindow(NOW, '3h').end).toBe(NOW + 10 * MINUTE);
  });
});

describe('tickTimes', () => {
  it.each([
    ['1h', 10],
    ['2h', 15],
    ['3h', 30],
    ['6h', 60],
  ] as [TimelineRange, number][])('spaces %s ticks %i minutes apart', (range: TimelineRange, minutes: number) => {
    expect(rangeTickMs(range)).toBe(minutes * MINUTE);
  });

  it.each(TIMELINE_RANGES.map((range: TimelineRange) => [range]))('places %s ticks on round times inside the window', (range: TimelineRange) => {
    const window: TimeWindow = timelineWindow(NOW, range);
    const tickMs: number = rangeTickMs(range);
    const ticks: number[] = tickTimes(window, tickMs);
    expect(ticks.length).toBeGreaterThanOrEqual(MIN_TICKS);
    expect(ticks.length).toBeLessThanOrEqual(MAX_TICKS);
    for (const tick of ticks) {
      expect(tick % tickMs).toBe(0);
      expect(tick).toBeGreaterThanOrEqual(window.start);
      expect(tick).toBeLessThan(window.end);
    }
    ticks.slice(1).forEach((tick: number, index: number) => expect(tick - ticks[index]).toBe(tickMs));
  });
});
