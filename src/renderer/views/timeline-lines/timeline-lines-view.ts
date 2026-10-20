import type { TimeSpan } from '../../../shared/types';
import { element } from '../../dom';
import { syncChildren } from '../grid/keyed-children';
import { renderClosedDivider } from '../timeline-closed-lane';
import type { TimelineControls } from '../timeline-header';
import { renderTimelineAxis, renderTimelineHeader } from '../timeline-header';
import type { TimeWindow } from '../timeline-layout';
import { tickTimes, timelineWindow } from '../timeline-layout';
import type { TimelineLane } from '../timeline-lanes';
import { timelineLanes } from '../timeline-lanes';
import { rangeTickMs } from '../timeline-range';
import type { TimelineChats } from '../timeline-view';
import type { CountStep } from './agent-count-series';
import { agentCountSeries, peakCount } from './agent-count-series';
import { animateMoves, measureTops } from './flip-animation';
import { linesLaneOrder } from './lines-order';
import { SparklineLane } from './sparkline-lane';
import type { SparkFrame } from './sparkline-track';

// Session ids are UUIDs, so this key can never clash with a lane's.
const DIVIDER_KEY: string = 'closed-divider';
// A chart with nothing running still needs a scale; one agent then reaches the top.
const MIN_PEAK: number = 1;

interface PlottedLane {
  readonly lane: TimelineLane;
  readonly steps: readonly CountStep[];
}

// The timeline's "Lines" style: one small chart per chat of how many of its agents were running.
// Unlike the bar view it keeps its elements across polls, so a lane that changes place glides there.
export class TimelineLinesView {
  readonly root: HTMLDivElement = element('div', 'timeline timeline-lines');
  private readonly header: HTMLDivElement = element('div', 'timeline-lines-header');
  private readonly axis: HTMLDivElement = element('div', 'timeline-lines-axis');
  private readonly lanesBox: HTMLDivElement = element('div', 'timeline-lanes');
  private readonly lanes: Map<string, SparklineLane> = new Map();
  private readonly divider: HTMLElement = renderClosedDivider();
  // Coming back from another view the old positions are stale; lanes should appear in place, not fly in.
  private isFreshlyMounted: boolean = true;

  constructor() {
    this.root.append(this.header, this.axis, this.lanesBox);
  }

  mount(host: HTMLElement): void {
    if (this.root.parentElement === host) return;
    host.replaceChildren(this.root);
    this.isFreshlyMounted = true;
  }

  update(chats: TimelineChats, now: number, controls: TimelineControls): void {
    const window: TimeWindow = timelineWindow(now, controls.range);
    const ticks: number[] = tickTimes(window, rangeTickMs(controls.range));
    const span: TimeSpan = { start: window.start, end: now };
    const plotted: PlottedLane[] = linesLaneOrder(timelineLanes(chats.open, chats.closed, span), span).map((lane: TimelineLane) => plot(lane, span, now));
    const before: Map<string, number> | null = this.isFreshlyMounted ? null : measureTops(this.keyedElements());
    this.header.replaceChildren(renderTimelineHeader(controls));
    this.axis.replaceChildren(renderTimelineAxis(window, ticks));
    const frame: SparkFrame = { window, ticks, now, peak: Math.max(MIN_PEAK, ...plotted.map((entry: PlottedLane) => peakCount(entry.steps))) };
    syncChildren(this.lanesBox, this.placeLanes(plotted, frame));
    this.dropMissing(plotted);
    if (before !== null) animateMoves(this.keyedElements(), before);
    this.isFreshlyMounted = false;
  }

  // The lanes in their new order, each refreshed, with the "Closed" divider before the first closed one.
  private placeLanes(plotted: readonly PlottedLane[], frame: SparkFrame): HTMLElement[] {
    const wanted: HTMLElement[] = [];
    plotted.forEach((entry: PlottedLane, index: number): void => {
      if (entry.lane.kind === 'closed' && plotted[index - 1]?.lane.kind !== 'closed') wanted.push(this.divider);
      wanted.push(this.refreshLane(entry, frame));
    });
    return wanted;
  }

  private refreshLane(entry: PlottedLane, frame: SparkFrame): HTMLElement {
    const sessionId: string = entry.lane.chat.sessionId;
    const lane: SparklineLane = this.lanes.get(sessionId) ?? new SparklineLane();
    this.lanes.set(sessionId, lane);
    if (entry.lane.kind === 'open') lane.showOpen(entry.lane.chat, entry.steps, frame);
    else lane.showClosed(entry.lane.chat, entry.steps, frame);
    return lane.root;
  }

  private dropMissing(plotted: readonly PlottedLane[]): void {
    const shown: ReadonlySet<string> = new Set(plotted.map((entry: PlottedLane) => entry.lane.chat.sessionId));
    [...this.lanes.keys()].filter((sessionId: string) => !shown.has(sessionId)).forEach((sessionId: string): void => void this.lanes.delete(sessionId));
  }

  private keyedElements(): Map<string, HTMLElement> {
    const elements: Map<string, HTMLElement> = new Map([[DIVIDER_KEY, this.divider]]);
    this.lanes.forEach((lane: SparklineLane, sessionId: string): void => void elements.set(sessionId, lane.root));
    return elements;
  }
}

function plot(lane: TimelineLane, span: TimeSpan, now: number): PlottedLane {
  return { lane, steps: agentCountSeries(lane.chat.agents, span, now) };
}
