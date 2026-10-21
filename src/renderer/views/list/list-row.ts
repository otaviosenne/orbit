import { statusAge } from '../../../shared/chat-time';
import type { AgentSnapshot, ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { formatClock, formatDuration } from '../../format';
import { PIN_FILLED_ICON } from '../../icons';
import { chatColor } from '../../palette';
import { renderSpinner } from '../../spinner';
import { GRIP_ICON } from './list-icons';
import type { ListStatus } from './list-status';

// Its own name, not data-session: the board's press handler and Orbit Web's touch taps both act on that attribute,
// and would open the chat on press or swallow the touch before a hold could turn into a drag.
export const LIST_SESSION_ATTRIBUTE: string = 'listSession';
export const ROW_SELECTOR: string = '[data-list-session]';
export const ROW_BUTTON_CLASS: string = 'list-row-button';
export const GRIP_SELECTOR: string = '.list-row-grip';

// One chat's place in the list. The item and its button outlive every poll, so keyboard focus and a press in
// progress survive the 2 s refresh; only what is inside the button is redrawn.
export interface ListRow {
  readonly item: HTMLLIElement;
  readonly button: HTMLButtonElement;
}

export interface RowState {
  readonly chat: ChatSnapshot;
  readonly status: ListStatus;
  readonly isOpen: boolean;
  readonly isPinned: boolean;
  readonly hasUnreadReply: boolean;
  readonly isManual: boolean;
}

export function createRow(sessionId: string): ListRow {
  const item: HTMLLIElement = element('li', 'list-row');
  item.dataset[LIST_SESSION_ATTRIBUTE] = sessionId;
  const button: HTMLButtonElement = element('button', ROW_BUTTON_CLASS);
  button.type = 'button';
  item.append(button);
  return { item, button };
}

export function fillRow(row: ListRow, state: RowState, now: number): void {
  // Toggled rather than reassigned, so the drag's own classes stay while a drop lays the rows out again.
  row.item.classList.toggle('is-open', state.isOpen);
  row.item.classList.toggle('is-unseen', state.hasUnreadReply);
  row.item.style.setProperty('--chat', chatColor(state.chat.color));
  row.button.setAttribute('aria-current', String(state.isOpen));
  row.button.replaceChildren(
    element('span', 'list-row-dot'),
    renderMain(state),
    renderSide(state, now),
    ...(state.isManual ? [renderGrip()] : []),
  );
}

function renderMain(state: RowState): HTMLElement {
  const title: HTMLSpanElement = element('span', 'list-row-title');
  title.append(element('span', 'list-row-name', state.chat.name));
  if (state.isPinned) title.append(renderPinMark());
  if (state.hasUnreadReply) title.append(element('span', 'unseen-dot'));
  const detail: HTMLSpanElement = element('span', 'list-row-detail');
  detail.append(element('span', 'list-row-repo', state.chat.repository.name));
  const agents: number = runningAgents(state.chat.agents);
  if (agents > 0) detail.append(element('span', 'list-row-agents', agentLabel(agents)));
  const main: HTMLSpanElement = element('span', 'list-row-main');
  main.append(title, detail);
  return main;
}

function renderSide(state: RowState, now: number): HTMLElement {
  const time: HTMLSpanElement = element('span', 'list-row-time', formatDuration(statusAge(state.chat, now)));
  time.title = `Since ${formatClock(now - statusAge(state.chat, now))}`;
  if (state.chat.status === 'busy') time.prepend(renderSpinner());
  const side: HTMLSpanElement = element('span', 'list-row-side');
  side.append(element('span', `list-status list-status-${state.status.key}`, state.status.label), time);
  return side;
}

function renderPinMark(): HTMLSpanElement {
  const mark: HTMLSpanElement = element('span', 'list-row-pin');
  mark.setAttribute('aria-label', 'Pinned');
  mark.innerHTML = PIN_FILLED_ICON;
  return mark;
}

function renderGrip(): HTMLSpanElement {
  const grip: HTMLSpanElement = element('span', 'list-row-grip');
  grip.setAttribute('aria-hidden', 'true');
  grip.innerHTML = GRIP_ICON;
  return grip;
}

function runningAgents(agents: readonly AgentSnapshot[]): number {
  return agents.filter((agent: AgentSnapshot) => agent.state === 'running').length;
}

function agentLabel(count: number): string {
  return `${count} ${count === 1 ? 'agent' : 'agents'}`;
}
