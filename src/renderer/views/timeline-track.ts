import type { AgentSnapshot } from '../../shared/types';
import { element } from '../dom';
import type { Tip } from '../tooltip';
import { setTip } from '../tooltip';
import type { LaneLayout, PlacedBar, TimeWindow } from './timeline-layout';
import { layoutLane, toPercent } from './timeline-layout';
import { finishedAgentTip, quietAgentTip, runningAgentTip, wasWritingTip } from './timeline-tips';

const ROW_HEIGHT_PX: number = 13;
const LANE_PADDING_PX: number = 16;
const MIN_BAR_PERCENT: number = 0.4;
// Marks a bar with its agent, so clicking it opens that agent rather than the whole chat.
export const TIMELINE_AGENT_ATTRIBUTE: string = 'timelineAgent';

// A lane's drawing area: the grid, the chat's own activity lines, one bar per agent and the now line.
export function renderTrack(agents: readonly AgentSnapshot[], activity: readonly HTMLElement[], window: TimeWindow, ticks: readonly number[], now: number): HTMLElement {
  const layout: LaneLayout = layoutLane(agents, window, now);
  const track: HTMLDivElement = element('div', 'lane-track');
  track.style.height = `${Math.max(1, layout.rows) * ROW_HEIGHT_PX + LANE_PADDING_PX}px`;
  track.append(...ticks.map((tick: number) => renderGridLine(tick, window)), ...activity);
  track.append(...layout.bars.flatMap((bar: PlacedBar) => renderBar(bar, window, now)), renderNowLine(window, now));
  return track;
}

// A thin line under the bars for a stretch of time the chat itself spent working.
export function renderActivityLine(className: string, from: number, to: number, window: TimeWindow, tip: Tip): HTMLElement {
  return span(className, toPercent(from, window), toPercent(to, window), null, tip);
}

function renderBar(bar: PlacedBar, window: TimeWindow, now: number): HTMLElement[] {
  const bars: HTMLElement[] = renderBarParts(bar, window, now);
  bars.forEach((part: HTMLElement): void => void (part.dataset[TIMELINE_AGENT_ATTRIBUTE] = bar.agent.id));
  return bars;
}

function renderBarParts(bar: PlacedBar, window: TimeWindow, now: number): HTMLElement[] {
  const { agent, row, to } = bar;
  const top: number = LANE_PADDING_PX / 2 + row * ROW_HEIGHT_PX;
  if (agent.state === 'done') return [span('bar bar-done', toPercent(agent.startedAt, window), toPercent(to, window), top, finishedAgentTip(agent, to))];
  if (agent.state === 'running') return [span('bar bar-running', toPercent(agent.startedAt, window), toPercent(to, window), top, runningAgentTip(agent, now))];
  // A silent agent: solid while it was writing, striped since it went quiet.
  return [
    span('bar bar-running', toPercent(agent.startedAt, window), toPercent(agent.lastActivityAt, window), top, wasWritingTip(agent)),
    span('bar bar-quiet', toPercent(agent.lastActivityAt, window), toPercent(to, window), top, quietAgentTip(agent, now)),
  ];
}

// One line per tick, placed like its label, so the grid lines up with the axis at any range.
export function renderGridLine(tick: number, window: TimeWindow): HTMLElement {
  const line: HTMLDivElement = element('div', 'grid-line');
  line.style.left = `${toPercent(tick, window)}%`;
  return line;
}

export function renderNowLine(window: TimeWindow, now: number): HTMLElement {
  const line: HTMLDivElement = element('div', 'now-line');
  line.style.left = `${toPercent(now, window)}%`;
  return line;
}

function span(className: string, fromPercent: number, toPercentValue: number, top: number | null, tip: Tip): HTMLElement {
  const node: HTMLDivElement = element('div', className);
  node.style.left = `${fromPercent}%`;
  node.style.width = `${Math.max(MIN_BAR_PERCENT, toPercentValue - fromPercent)}%`;
  if (top !== null) node.style.top = `${top}px`;
  setTip(node, tip);
  return node;
}
