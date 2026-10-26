import { restingSince } from '../../shared/chat-time';
import type { ChatSnapshot } from '../../shared/types';
import { isWorking } from '../work-state';

export type ColumnKey = 'needs' | 'busy' | 'active' | 'idle';

export interface BoardColumn {
  readonly key: ColumnKey;
  readonly title: string;
  // Shown behind an "i" next to the title, for columns whose rule is not obvious.
  readonly info: string | null;
  readonly chats: readonly ChatSnapshot[];
}

export type UnseenCheck = (chat: ChatSnapshot) => boolean;

// A finished chat you have already seen stays "Active" this long, then drops to "Idle".
export const ACTIVE_WINDOW_MS: number = 20 * 60_000;

// A resting chat dragged to Active or Idle stays there for the rest of that resting stretch; null follows the clock.
export type RestingColumn = 'active' | 'idle';
export type RestingPin = (chat: ChatSnapshot) => RestingColumn | null;
const NO_PIN: RestingPin = (): null => null;

interface ColumnRule {
  readonly key: ColumnKey;
  readonly title: string;
  readonly info: string | null;
  readonly accepts: (chat: ChatSnapshot, isUnseen: UnseenCheck, now: number, pin: RestingPin) => boolean;
}

// Waiting on a permission prompt, or finished with a reply you have not opened yet.
function needsUser(chat: ChatSnapshot, isUnseen: UnseenCheck): boolean {
  return chat.status === 'waiting' || isUnseen(chat);
}

function isResting(chat: ChatSnapshot, isUnseen: UnseenCheck): boolean {
  return !isWorking(chat) && !needsUser(chat, isUnseen);
}

function restingColumn(chat: ChatSnapshot, now: number, pin: RestingPin): RestingColumn {
  return pin(chat) ?? (now - restingSince(chat) < ACTIVE_WINDOW_MS ? 'active' : 'idle');
}

const COLUMN_RULES: readonly ColumnRule[] = [
  { key: 'needs', title: 'Needs you', info: null, accepts: (chat, isUnseen): boolean => needsUser(chat, isUnseen) },
  { key: 'busy', title: 'Working', info: null, accepts: (chat, isUnseen): boolean => isWorking(chat) && !needsUser(chat, isUnseen) },
  {
    key: 'active',
    title: 'Active',
    info: null,
    accepts: (chat, isUnseen, now, pin): boolean => isResting(chat, isUnseen) && restingColumn(chat, now, pin) === 'active',
  },
  {
    key: 'idle',
    title: 'Idle',
    info: 'Chats you have already seen that finished more than 20 minutes ago. Drag a card between Active and Idle to move it yourself.',
    accepts: (chat, isUnseen, now, pin): boolean => isResting(chat, isUnseen) && restingColumn(chat, now, pin) === 'idle',
  },
];

// Inside each column, chats you have not looked at since they finished come first.
export function toBoardColumns(chats: readonly ChatSnapshot[], isUnseen: UnseenCheck, now: number, pin: RestingPin = NO_PIN): BoardColumn[] {
  const order = (a: ChatSnapshot, b: ChatSnapshot): number => Number(isUnseen(b)) - Number(isUnseen(a)) || byName(a, b);
  return COLUMN_RULES.map((rule: ColumnRule) => ({
    key: rule.key,
    title: rule.title,
    info: rule.info,
    chats: chats.filter((chat: ChatSnapshot) => rule.accepts(chat, isUnseen, now, pin)).sort(order),
  }));
}

function byName(a: ChatSnapshot, b: ChatSnapshot): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}
