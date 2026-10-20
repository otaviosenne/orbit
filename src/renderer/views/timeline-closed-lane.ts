import type { ClosedChatActivity, TimeSpan } from '../../shared/types';
import { element } from '../dom';
import { formatClock } from '../format';
import { chatColor } from '../palette';
import type { TimeWindow } from './timeline-layout';
import { renderActivityLine, renderTrack } from './timeline-track';
import { closedTurnTip } from './timeline-tips';

// Quieter than an open lane and not clickable: there is no live chat behind it to open.
export function renderClosedLane(chat: ClosedChatActivity, window: TimeWindow, ticks: readonly number[], now: number): HTMLElement {
  const lane: HTMLDivElement = element('div', 'lane lane-closed');
  lane.style.setProperty('--chat', chatColor(chat.color));
  const label: HTMLDivElement = element('div', 'lane-label');
  label.title = chat.title;
  label.append(
    element('span', 'lane-name', chat.title),
    element('span', 'lane-status', `${chat.repository.name} · last active ${formatClock(chat.lastActivityAt)}`),
  );
  const turns: HTMLElement[] = chat.turns.map((turn: TimeSpan) => renderTurn(turn, window));
  lane.append(label, renderTrack(chat.agents, turns, window, ticks, now));
  return lane;
}

function renderTurn(turn: TimeSpan, window: TimeWindow): HTMLElement {
  return renderActivityLine('turn-line', turn.start, turn.end, window, closedTurnTip(turn));
}

export function renderClosedDivider(): HTMLElement {
  return element('div', 'lane-divider', 'Closed');
}
