import type { ChatSnapshot } from '../../shared/types';
import { element } from '../dom';
import { chatColor } from '../palette';
import { renderPinMark } from './card-marks';
import { SESSION_ATTRIBUTE } from './board-attributes';
import { renderUnseenDot } from '../unseen-dot';

// Why a chat's card stays on the board with no process behind it.
export type ClosedCardKind = 'closed-pin' | 'suspended' | 'left-open';

interface ClosedCardLook {
  // Shown where an open card has its time in status.
  readonly label: string;
  readonly className: string;
}

const LOOKS: Readonly<Record<ClosedCardKind, ClosedCardLook>> = {
  'closed-pin': { label: 'Closed', className: 'card is-closed' },
  'left-open': { label: 'Closed', className: 'card is-closed' },
  suspended: { label: 'Suspended', className: 'card is-closed is-suspended' },
};

// What the card and the chat's read-only panel say instead of a status.
export function closedCardLabel(kind: ClosedCardKind): string {
  return LOOKS[kind].label;
}

// A chat whose window is closed: same card, faded, saying so instead of a time. One left unread keeps the green dot:
// a question it was waiting on can no longer be answered, so only the unread mark is left to show.
export function renderClosedCard(chat: ChatSnapshot, kind: ClosedCardKind, isPinned: boolean, hasUnread: boolean = false): HTMLElement {
  const look: ClosedCardLook = LOOKS[kind];
  const card: HTMLElement = element('article', `${look.className}${hasUnread ? ' is-unseen' : ''}`);
  card.dataset[SESSION_ATTRIBUTE] = chat.sessionId;
  card.style.setProperty('--chat', chatColor(chat.color));
  const top: HTMLDivElement = element('div', 'card-top');
  const time: HTMLSpanElement = element('span', 'card-time', look.label);
  if (hasUnread) time.prepend(renderUnseenDot('unread'));
  if (isPinned) time.prepend(renderPinMark());
  top.append(element('span', 'card-name', chat.name), time);
  card.append(top, element('div', 'card-repo', chat.repository.name));
  return card;
}
