import { renderUnseenDot, showsDot } from '../unseen-dot';
import { statusAge } from '../../shared/chat-time';
import type { ChatDevices, ChatSnapshot } from '../../shared/types';
import { renderCardDevices } from '../board/card-devices';
import { element } from '../dom';
import { formatDuration } from '../format';
import { INFO_ICON } from '../icons';
import { chatColor, textOnChatColor } from '../palette';
import { renderWorkSpinner } from '../spinner';
import { workStateOf } from '../work-state';
import { renderChatNumber } from '../voice-nav/voice-number';
import { renderAgentRows } from './agent-rows';
import type { BoardColumn, RestingPin, UnseenCheck } from './board-columns';
import { toBoardColumns } from './board-columns';
import { DROP_ZONE_ATTRIBUTE, SESSION_ATTRIBUTE } from './board-attributes';
import { renderPinMark } from './card-marks';
import { renderClosedCard } from './closed-card';
import { renderSuspendedRow } from './suspended-row';
import type { BoardZone } from '../board/drop-rules';
import type { LeftOpenChat } from '../suspend/closed-chats';

export { DROP_ZONE_ATTRIBUTE, DROP_ZONE_SELECTOR, SESSION_ATTRIBUTE } from './board-attributes';
const PINNED_TITLE: string = 'Pinned';
const COLUMNS_ZONE: BoardZone = 'columns';

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
  // Chats a shutdown left open: closed cards in the column they were in.
  readonly leftOpen: readonly LeftOpenChat[];
  // The order the user gave a section's cards by dragging them.
  readonly ordered: <T extends { readonly sessionId: string }>(zone: BoardZone, cards: readonly T[]) => T[];
  // Suspended chats, newest first, in their own section under the columns (a suspended pin is in Pinned too).
  readonly suspended: readonly ChatSnapshot[];
  readonly isSuspendedCollapsed: boolean;
  // Active or Idle chosen by dragging, for the rest of the chat's resting stretch.
  readonly restingPin: RestingPin;
  // The emulator and Chrome tab the chat has open, shown as icons beside its name.
  readonly devicesOf: (sessionId: string) => ChatDevices;
}

// Pinned chats in a row on top (they also keep their place below), then Needs you | Working | Active over Idle,
// then Suspended at the bottom.
export function renderBoard(chats: readonly ChatSnapshot[], marks: BoardMarks, now: number): HTMLElement {
  const layout: HTMLDivElement = element('div', 'board-layout');
  const pinned: ChatSnapshot[] = pinnedChats([...chats, ...marks.closedPins], marks.pinnedOrder);
  if (pinned.length > 0) layout.append(renderPinnedRow(pinned, marks, now));
  layout.append(renderColumns(chats, marks, now));
  // Every suspended chat is listed here, a pinned one too: it also stays in the Pinned row, labelled Suspended.
  if (marks.suspended.length > 0) layout.append(renderSuspendedRow(marks.ordered('suspended', marks.suspended), marks.isSuspendedCollapsed, marks.pinnedOrder));
  return layout;
}

function pinnedChats(chats: readonly ChatSnapshot[], order: readonly string[]): ChatSnapshot[] {
  return order.flatMap((sessionId: string) => chats.filter((chat: ChatSnapshot) => chat.sessionId === sessionId));
}

function renderPinnedRow(pinned: readonly ChatSnapshot[], marks: BoardMarks, now: number): HTMLElement {
  const section: HTMLElement = renderPinnedSection();
  const cards: HTMLDivElement = element('div', 'pinned-cards');
  const suspendedIds: ReadonlySet<string> = new Set(marks.suspended.map((chat: ChatSnapshot) => chat.sessionId));
  const closedCard = (chat: ChatSnapshot): HTMLElement => renderClosedCard(chat, suspendedIds.has(chat.sessionId) ? 'suspended' : 'closed-pin', true);
  cards.append(...pinned.map((chat: ChatSnapshot) => (marks.closedPins.includes(chat) ? closedCard(chat) : renderCard(chat, marks, now))));
  section.append(cards);
  return section;
}

// With nothing pinned the row is not drawn, so a drag shows this empty one to drop on.
export function renderPinnedDropZone(): HTMLElement {
  const section: HTMLElement = renderPinnedSection();
  section.classList.add('is-drop-placeholder');
  section.append(element('div', 'pinned-cards'));
  return section;
}

function renderPinnedSection(): HTMLElement {
  const section: HTMLElement = element('section', 'pinned-row');
  section.dataset[DROP_ZONE_ATTRIBUTE] = 'pinned';
  section.append(element('h2', 'column-title', PINNED_TITLE));
  return section;
}

function renderColumns(chats: readonly ChatSnapshot[], marks: BoardMarks, now: number): HTMLElement {
  const [needs, busy, active, idle] = toBoardColumns(chats, marks.isUnseen, now, marks.restingPin).map((column: BoardColumn) => renderColumn(column, marks, now));
  const resting: HTMLDivElement = element('div', 'column-stack');
  resting.append(...[active, idle].filter((column): column is HTMLElement => column !== undefined));
  const board: HTMLElement = element('div', 'board');
  // A card taken out of Pinned can be dropped anywhere here: it only unpins.
  board.dataset[DROP_ZONE_ATTRIBUTE] = COLUMNS_ZONE;
  board.append(...[needs, busy].filter((column): column is HTMLElement => column !== undefined), resting);
  return board;
}

function renderColumn(column: BoardColumn, marks: BoardMarks, now: number): HTMLElement {
  const section: HTMLElement = element('section', `column column-${column.key}`);
  section.dataset[DROP_ZONE_ATTRIBUTE] = column.key;
  const heading: HTMLHeadingElement = element('h2', 'column-title', column.title);
  const closed: LeftOpenChat[] = marks.leftOpen.filter((entry: LeftOpenChat) => entry.column === column.key);
  const count: number = column.chats.length + closed.length;
  heading.append(element('span', `column-count${count > 0 ? ' has-items' : ''}`, String(count)));
  if (column.info !== null) heading.append(renderInfo(column.info));
  section.append(heading, ...marks.ordered(column.key, column.chats).map((chat: ChatSnapshot) => renderCard(chat, marks, now)));
  section.append(...closed.map((entry: LeftOpenChat) => renderClosedCard(entry.chat, 'left-open', false)));
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
  // For the hover preview's bubbles (board/card-preview.ts), which take the card's colors.
  card.style.setProperty('--on-chat', textOnChatColor(chat.color));
  const top: HTMLDivElement = element('div', 'card-top');
  const time: HTMLSpanElement = element('span', 'card-time', formatDuration(statusAge(chat, now)));
  if (showsDot(chat.status, hasUnread)) time.prepend(renderUnseenDot(chat.status === 'waiting'));
  const spinner: HTMLElement | null = renderWorkSpinner(workStateOf(chat));
  if (spinner !== null) time.prepend(spinner);
  if (marks.pinnedOrder.includes(chat.sessionId)) time.prepend(renderPinMark());
  top.append(renderTitle(chat.name, marks.devicesOf(chat.sessionId)), time);
  card.append(top, renderRepository(chat), ...renderAgentRows(chat.agents, now));
  return card;
}

// The repository, led by the chat's voice number (shown only while voice is active).
function renderRepository(chat: ChatSnapshot): HTMLElement {
  const repository: HTMLDivElement = element('div', 'card-repo', chat.repository.name);
  const number: HTMLSpanElement | null = renderChatNumber(chat.sessionId);
  if (number !== null) repository.prepend(number);
  return repository;
}

// The name with the chat's device icons right after it; the name gives way to them when space runs short.
function renderTitle(name: string, devices: ChatDevices): HTMLElement {
  const title: HTMLDivElement = element('div', 'card-title');
  title.append(element('span', 'card-name', name), ...renderCardDevices(devices));
  return title;
}
