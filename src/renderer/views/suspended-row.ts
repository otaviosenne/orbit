import type { ChatSnapshot } from '../../shared/types';
import type { BoardZone } from '../board/drop-rules';
import { element } from '../dom';
import { CARET_DOWN_ICON } from '../icons';
import { DROP_ZONE_ATTRIBUTE } from './board-attributes';
import { renderClosedCard } from './closed-card';

// The header button folds the section; the board is rebuilt on every poll, so the press is caught by delegation.
export const SUSPENDED_TOGGLE_SELECTOR: string = '[data-suspended-toggle]';
const SUSPENDED_TOGGLE_ATTRIBUTE: string = 'suspendedToggle';
const SUSPENDED_ZONE: BoardZone = 'suspended';
const TITLE: string = 'Suspended';

// Suspended chats at the bottom of the board, the opposite of Pinned on top: faded, one line, foldable to its header.
export function renderSuspendedRow(chats: readonly ChatSnapshot[], isCollapsed: boolean, pinnedOrder: readonly string[]): HTMLElement {
  const section: HTMLElement = renderSuspendedSection(chats.length, isCollapsed);
  if (isCollapsed) return section;
  const cards: HTMLDivElement = element('div', 'suspended-cards');
  cards.append(...chats.map((chat: ChatSnapshot) => renderClosedCard(chat, 'suspended', pinnedOrder.includes(chat.sessionId))));
  section.append(cards);
  return section;
}

// With nothing suspended the section is not drawn, so a drag shows this empty one to drop on.
export function renderSuspendedDropZone(): HTMLElement {
  const section: HTMLElement = renderSuspendedSection(0, false);
  section.classList.add('is-drop-placeholder');
  section.append(element('div', 'suspended-cards'));
  return section;
}

function renderSuspendedSection(count: number, isCollapsed: boolean): HTMLElement {
  const section: HTMLElement = element('section', `suspended-row${isCollapsed ? ' is-collapsed' : ''}`);
  section.dataset[DROP_ZONE_ATTRIBUTE] = SUSPENDED_ZONE;
  const heading: HTMLHeadingElement = element('h2', 'column-title');
  heading.append(renderToggle(count, isCollapsed));
  section.append(heading);
  return section;
}

function renderToggle(count: number, isCollapsed: boolean): HTMLButtonElement {
  const toggle: HTMLButtonElement = element('button', 'suspended-toggle');
  toggle.type = 'button';
  toggle.dataset[SUSPENDED_TOGGLE_ATTRIBUTE] = '';
  toggle.setAttribute('aria-expanded', String(!isCollapsed));
  const caret: HTMLSpanElement = element('span', 'suspended-caret');
  caret.innerHTML = CARET_DOWN_ICON;
  toggle.append(caret, element('span', '', TITLE), element('span', `column-count${count > 0 ? ' has-items' : ''}`, String(count)));
  return toggle;
}
