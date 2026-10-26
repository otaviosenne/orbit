import type { ChatSnapshot, ClosedChatActivity } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';
import { chatColor } from '../palette';
import { renderWorkSpinner } from '../spinner';
import { workStateOf } from '../work-state';
import { chatStatusLabel } from '../status-label';
import { SESSION_ATTRIBUTE } from './board-view';
import { renderClosedDivider, renderClosedLane } from './timeline-closed-lane';
import type { TimeWindow } from './timeline-layout';
import { tickTimes, timelineWindow } from './timeline-layout';
import type { TimelineLane } from './timeline-lanes';
import { timelineLanes } from './timeline-lanes';
import { rangeTickMs } from './timeline-range';
import type { TimelineControls } from './timeline-header';
import { renderTimelineAxis, renderTimelineHeader } from './timeline-header';
import { renderActivityLine, renderTrack } from './timeline-track';
import { chatStatusTip } from './timeline-tips';

const LANES_SELECTOR: string = '.timeline-lanes';

export interface TimelineChats {
  readonly open: readonly ChatSnapshot[];
  readonly closed: readonly ClosedChatActivity[];
}

export function renderTimeline(chats: TimelineChats, now: number, controls: TimelineControls): HTMLElement {
  const window: TimeWindow = timelineWindow(now, controls.range);
  const ticks: number[] = tickTimes(window, rangeTickMs(controls.range));
  const root: HTMLElement = element('div', 'timeline');
  const lanes: HTMLDivElement = element('div', 'timeline-lanes');
  const shown: TimelineLane[] = timelineLanes(chats.open, chats.closed, { start: window.start, end: now });
  for (const [index, lane] of shown.entries()) {
    if (lane.kind === 'closed' && shown[index - 1]?.kind !== 'closed') lanes.append(renderClosedDivider());
    lanes.append(lane.kind === 'open' ? renderOpenLane(lane.chat, window, ticks, now) : renderClosedLane(lane.chat, window, ticks, now));
  }
  root.append(renderTimelineHeader(controls), renderTimelineAxis(window, ticks), lanes);
  return root;
}

// The timeline is rebuilt on every poll; carrying the lanes' scroll over keeps closed lanes below the fold in view.
export function mountTimeline(viewRoot: HTMLElement, timeline: HTMLElement): void {
  const scrollTop: number = viewRoot.querySelector<HTMLElement>(LANES_SELECTOR)?.scrollTop ?? 0;
  viewRoot.replaceChildren(timeline);
  const lanes: HTMLElement | null = viewRoot.querySelector<HTMLElement>(LANES_SELECTOR);
  if (lanes !== null) lanes.scrollTop = scrollTop;
}

function renderOpenLane(chat: ChatSnapshot, window: TimeWindow, ticks: readonly number[], now: number): HTMLElement {
  const lane: HTMLDivElement = element('div', 'lane');
  lane.dataset[SESSION_ATTRIBUTE] = chat.sessionId;
  lane.style.setProperty('--chat', chatColor(chat.color));
  const label: HTMLDivElement = element('div', 'lane-label');
  label.append(
    element('span', 'lane-name', chat.name),
    renderLaneStatus(chat, now),
  );
  lane.append(label, renderTrack(chat.agents, renderStatusLine(chat, window, now), window, ticks, now));
  return lane;
}

export function renderLaneStatus(chat: ChatSnapshot, now: number): HTMLElement {
  const status: HTMLSpanElement = element('span', `lane-status status-${chat.status}`, `${chat.repository.name} · ${chatStatusLabel(chat.status)} ${formatDuration(now - chat.statusSince)}`);
  const spinner: HTMLElement | null = renderWorkSpinner(workStateOf(chat));
  if (spinner !== null) status.prepend(spinner);
  return status;
}

// The chat itself: a thin line from when it started working (or waiting) up to now.
function renderStatusLine(chat: ChatSnapshot, window: TimeWindow, now: number): HTMLElement[] {
  if (chat.status !== 'busy' && chat.status !== 'waiting') return [];
  return [renderActivityLine('status-line', chat.statusSince, now, window, chatStatusTip(chat, now))];
}
