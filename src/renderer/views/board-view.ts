import { statusAge } from '../../shared/chat-time';
import type { ChatSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';
import { INFO_ICON, PIN_FILLED_ICON } from '../icons';
import { chatColor } from '../palette';
import { renderSpinner } from '../spinner';
import { renderAgentRows } from './agent-rows';
import type { BoardColumn, RestingPin, UnseenCheck } from './board-columns';
import { toBoardColumns } from './board-columns';

export const SESSION_ATTRIBUTE: string = 'session';

// What the board needs to know about each chat beyond its snapshot.
export interface BoardMarks {
  readonly openSessionId: string | null;
  // Decides the column: finished since you last left it.
  readonly isUnseen: UnseenCheck;
  // Decides the green dot: unseen and not open right now.
  readonly hasUnreadReply: UnseenCheck;
  readonly pinnedOrder: readonly string[];
  // Pinned chats that are closed now: they keep their place in the Pinned row, faded.
  readonly closedPins: readonly ChatSnapshot[];
  // Active or Idle chosen by dragging, for the rest of the chat's resting stretch.
  readonly restingPin: RestingPin;
}

// Pinned chats in a row on top (they also keep their place below), then Needs you | Working | Active over Idle.
export function renderBoard(chats: readonly ChatSnapshot[], marks: BoardMarks, now: number): HTMLElement {
  const layout: HTMLDivElement = element('div', 'board-layout');
  const pinned: ChatSnapshot[] = pinnedChats([...chats, ...marks.closedPins], marks.pinnedOrder);
  if (pinned.length > 0) layout.append(renderPinnedRow(pinned, marks, now));
  layout.append(renderColumns(chats, marks, now));
  return layout;
}

function pinnedChats(chats: readonly ChatSnapshot[], order: readonly string[]): ChatSnapshot[] {
  return order.flatMap((sessionId: string) => chats.filter((chat: ChatSnapshot) => chat.sessionId === sessionId));
}

function renderPinnedRow(pinned: readonly ChatSnapshot[], marks: BoardMarks, now: number): HTMLElement {
  const section: HTMLElement = element('section', 'pinned-row');
  const cards: HTMLDivElement = element('div', 'pinned-cards');
  cards.append(...pinned.map((chat: ChatSnapshot) => (marks.closedPins.includes(chat) ? renderClosedCard(chat) : renderCard(chat, marks, now))));
  section.append(element('h2', 'column-title', 'Pinned'), cards);
  return section;
}

function renderColumns(chats: readonly ChatSnapshot[], marks: BoardMarks, now: number): HTMLElement {
  const [needs, busy, active, idle] = toBoardColumns(chats, marks.isUnseen, now, marks.restingPin).map((column: BoardColumn) => renderColumn(column, marks, now));
  const resting: HTMLDivElement = element('div', 'column-stack');
  resting.append(...[active, idle].filter((column): column is HTMLElement => column !== undefined));
  const board: HTMLElement = element('div', 'board');
  board.append(...[needs, busy].filter((column): column is HTMLElement => column !== undefined), resting);
  return board;
}

function renderColumn(column: BoardColumn, marks: BoardMarks, now: number): HTMLElement {
  const section: HTMLElement = element('section', `column column-${column.key}`);
  const heading: HTMLHeadingElement = element('h2', 'column-title', column.title);
  heading.append(element('span', `column-count${column.chats.length > 0 ? ' has-items' : ''}`, String(column.chats.length)));
  if (column.info !== null) heading.append(renderInfo(column.info));
  section.append(heading, ...column.chats.map((chat: ChatSnapshot) => renderCard(chat, marks, now)));
  return section;
}

// An "i" that explains the column on hover or click (focus), without a native tooltip delay.
function renderInfo(text: string): HTMLElement {
  const info: HTMLButtonElement = element('button', 'column-info');
  info.type = 'button';
  info.setAttribute('aria-label', text);
  info.innerHTML = INFO_ICON;
  info.append(element('span', 'column-info-tip', text));
  return info;
}

function renderCard(chat: ChatSnapshot, marks: BoardMarks, now: number): HTMLElement {
  const isOpen: boolean = chat.sessionId === marks.openSessionId;
  const hasUnread: boolean = marks.hasUnreadReply(chat);
  const card: HTMLElement = element('article', `card${isOpen ? ' is-open' : ''}${hasUnread ? ' is-unseen' : ''}`);
  card.dataset[SESSION_ATTRIBUTE] = chat.sessionId;
  card.style.setProperty('--chat', chatColor(chat.color));
  const top: HTMLDivElement = element('div', 'card-top');
  const time: HTMLSpanElement = element('span', 'card-time', formatDuration(statusAge(chat, now)));
  if (hasUnread) time.prepend(element('span', 'unseen-dot'));
  if (chat.status === 'busy') time.prepend(renderSpinner());
  if (marks.pinnedOrder.includes(chat.sessionId)) time.prepend(renderPinMark());
  top.append(element('span', 'card-name', chat.name), time);
  card.append(top, element('div', 'card-repo', chat.repository.name), ...renderAgentRows(chat.agents, now));
  return card;
}

// Pinning happens from the card's right-click menu; a pinned chat shows a filled pin left of its time.
function renderPinMark(): HTMLSpanElement {
  const mark: HTMLSpanElement = element('span', 'card-pin');
  mark.setAttribute('aria-label', 'Pinned');
  mark.innerHTML = PIN_FILLED_ICON;
  return mark;
}

// A pinned chat whose window is closed: same card, faded, saying so instead of a time.
function renderClosedCard(chat: ChatSnapshot): HTMLElement {
  const card: HTMLElement = element('article', 'card is-closed');
  card.dataset[SESSION_ATTRIBUTE] = chat.sessionId;
  card.style.setProperty('--chat', chatColor(chat.color));
  const top: HTMLDivElement = element('div', 'card-top');
  const time: HTMLSpanElement = element('span', 'card-time', 'Closed');
  time.prepend(renderPinMark());
  top.append(element('span', 'card-name', chat.name), time);
  card.append(top, element('div', 'card-repo', chat.repository.name));
  return card;
}
