import type { AgentSnapshot } from '../../shared/types';
import type { TimelineRange } from './timeline-range';
import { rangeHistoryMs } from './timeline-range';

const MINUTE_MS: number = 60_000;
// Room to the right of "now" so running bars visibly end at the now line instead of the edge;
// proportional, so the now line sits at the same place whatever the range.
const LOOKAHEAD_SHARE_OF_HISTORY: number = 1 / 18;
// Bars closer than this share a row only if they do not touch, keeping each one readable.
const BAR_GAP_MS: number = 2 * MINUTE_MS;

export interface TimeWindow {
  readonly start: number;
  readonly end: number;
}

export interface PlacedBar {
  readonly agent: AgentSnapshot;
  readonly row: number;
  readonly to: number;
}

export interface LaneLayout {
  readonly bars: readonly PlacedBar[];
  readonly rows: number;
}

export function timelineWindow(now: number, range: TimelineRange): TimeWindow {
  const historyMs: number = rangeHistoryMs(range);
  return { start: now - historyMs, end: now + historyMs * LOOKAHEAD_SHARE_OF_HISTORY };
}

export function toPercent(time: number, window: TimeWindow): number {
  const ratio: number = (time - window.start) / (window.end - window.start);
  return Math.max(0, Math.min(1, ratio)) * 100;
}

// Round clock times (10:30, 11:00) read at a glance; offsets from the window's edge would drift every poll.
export function tickTimes(window: TimeWindow, tickMs: number): number[] {
  const ticks: number[] = [];
  for (let tick: number = Math.ceil(window.start / tickMs) * tickMs; tick < window.end; tick += tickMs) ticks.push(tick);
  return ticks;
}

// Greedy row packing: each bar takes the first row that is free by the time it starts.
export function layoutLane(agents: readonly AgentSnapshot[], window: TimeWindow, now: number): LaneLayout {
  const visible: AgentSnapshot[] = agents
    .filter((agent: AgentSnapshot) => (agent.endedAt ?? now) > window.start)
    .sort((a: AgentSnapshot, b: AgentSnapshot) => a.startedAt - b.startedAt);
  const rowFreeAt: number[] = [];
  const bars: PlacedBar[] = visible.map((agent: AgentSnapshot) => {
    const to: number = agent.endedAt ?? now;
    let row: number = rowFreeAt.findIndex((freeAt: number) => freeAt <= agent.startedAt);
    if (row === -1) row = rowFreeAt.push(0) - 1;
    rowFreeAt[row] = to + BAR_GAP_MS;
    return { agent, row, to };
  });
  return { bars, rows: rowFreeAt.length };
}
