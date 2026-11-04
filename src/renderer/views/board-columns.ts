import { restingSince, statusAge } from '../../shared/chat-time';
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

// A finished chat you have already seen stays "Active" this long after its last reply or the last time you read a
// new reply of it, whichever came later, then drops to "Idle".
export const ACTIVE_WINDOW_MS: number = 20 * 60_000;

// When the user last read a reply of the chat they had not seen yet (now while reading it), or null if never.
export type ReadCheck = (chat: ChatSnapshot, now: number) => number | null;
const NEVER_READ: ReadCheck = (): null => null;

// A resting chat dragged to Active or Idle stays there for the rest of that resting stretch; null follows the clock.
export type RestingColumn = 'active' | 'idle';
export type RestingPin = (chat: ChatSnapshot) => RestingColumn | null;
const NO_PIN: RestingPin = (): null => null;

interface ColumnRule {
  readonly key: ColumnKey;
  readonly title: string;
  readonly info: string | null;
  readonly accepts: (chat: ChatSnapshot, isUnseen: UnseenCheck, now: number, pin: RestingPin, lastRead: ReadCheck) => boolean;
}

// Waiting on a permission prompt or on the go-ahead for main or a release (even once read), or finished with a
// reply you have not opened yet.
function needsUser(chat: ChatSnapshot, isUnseen: UnseenCheck): boolean {
  return chat.status === 'waiting' || chat.approval !== null || isUnseen(chat);
}

function isResting(chat: ChatSnapshot, isUnseen: UnseenCheck): boolean {
  return !isWorking(chat) && !needsUser(chat, isUnseen);
}

// Reading a new reply restarts the chat's time in Active, so a reply read long after it came does not drop straight to
// Idle; opening a chat whose reply was already read leaves it where it is.
function restingColumn(chat: ChatSnapshot, now: number, pin: RestingPin, lastRead: ReadCheck): RestingColumn {
  const activeSince: number = Math.max(restingSince(chat), lastRead(chat, now) ?? 0);
  return pin(chat) ?? (now - activeSince < ACTIVE_WINDOW_MS ? 'active' : 'idle');
}

const COLUMN_RULES: readonly ColumnRule[] = [
  { key: 'needs', title: 'Needs you', info: null, accepts: (chat, isUnseen): boolean => needsUser(chat, isUnseen) },
  { key: 'busy', title: 'Working', info: null, accepts: (chat, isUnseen): boolean => isWorking(chat) && !needsUser(chat, isUnseen) },
  {
    key: 'active',
    title: 'Active',
    info: null,
    accepts: (chat, isUnseen, now, pin, lastRead): boolean => isResting(chat, isUnseen) && restingColumn(chat, now, pin, lastRead) === 'active',
  },
  {
    key: 'idle',
    title: 'Idle',
    info: 'Chats you last read, and that last replied, more than 20 minutes ago. Drag a card between Active and Idle to move it yourself.',
    accepts: (chat, isUnseen, now, pin, lastRead): boolean => isResting(chat, isUnseen) && restingColumn(chat, now, pin, lastRead) === 'idle',
  },
];

// Inside each column, chats you have not looked at since they finished come first. In Needs you the newest come
// first of all, so what just finished is on top.
export function toBoardColumns(
  chats: readonly ChatSnapshot[],
  isUnseen: UnseenCheck,
  now: number,
  pin: RestingPin = NO_PIN,
  lastRead: ReadCheck = NEVER_READ,
): BoardColumn[] {
  const order = (a: ChatSnapshot, b: ChatSnapshot): number => Number(isUnseen(b)) - Number(isUnseen(a)) || byName(a, b);
  const newestFirst = (a: ChatSnapshot, b: ChatSnapshot): number => statusAge(a, now) - statusAge(b, now) || order(a, b);
  return COLUMN_RULES.map((rule: ColumnRule) => ({
    key: rule.key,
    title: rule.title,
    info: rule.info,
    chats: chats.filter((chat: ChatSnapshot) => rule.accepts(chat, isUnseen, now, pin, lastRead)).sort(rule.key === 'needs' ? newestFirst : order),
  }));
}

function byName(a: ChatSnapshot, b: ChatSnapshot): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}
