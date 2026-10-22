import type { PastChat } from '../../shared/types';
import { element } from '../dom';
import { EYE_ICON } from '../icons';
import type { DayGroup } from './day-groups';
import { groupByDay } from './day-groups';
import { formatAgo, formatSize } from './past-chat-format';
import type { SortOrder } from './resume-filters';

export const PAST_CHAT_ATTRIBUTE: string = 'pastChat';
export const PEEK_SELECTOR: string = '.resume-row-peek';
const META_SEPARATOR: string = ' · ';

// Day headers only make sense while the list runs in time order.
export function renderPastChats(chats: readonly PastChat[], sort: SortOrder, now: number): HTMLElement[] {
  if (sort !== 'recent') return chats.map((chat: PastChat) => renderRow(chat, now));
  return groupByDay(chats, now).flatMap((group: DayGroup): HTMLElement[] => [
    element('div', 'resume-day', group.label),
    ...group.chats.map((chat: PastChat) => renderRow(chat, now)),
  ]);
}

function renderRow(chat: PastChat, now: number): HTMLButtonElement {
  const row: HTMLButtonElement = element('button', 'resume-row');
  row.type = 'button';
  row.dataset[PAST_CHAT_ATTRIBUTE] = chat.sessionId;
  row.title = chat.title;
  const meta: HTMLSpanElement = element('span', 'resume-row-meta');
  meta.append(
    element('span', 'resume-row-repo', chat.repository.name),
    document.createTextNode(`${META_SEPARATOR}${formatAgo(chat.lastActivityAt, now)}${META_SEPARATOR}${formatSize(chat.sizeBytes)}`),
  );
  row.append(element('span', 'resume-row-title', chat.title), meta, renderPeek());
  return row;
}

// The eye: look at the chat's history without reopening it. A span, not a button, since it sits inside the row's button.
function renderPeek(): HTMLSpanElement {
  const peek: HTMLSpanElement = element('span', 'resume-row-peek');
  peek.setAttribute('role', 'button');
  peek.setAttribute('aria-label', 'Look at this chat without reopening it');
  peek.title = 'Look at it without reopening';
  peek.innerHTML = EYE_ICON;
  return peek;
}
