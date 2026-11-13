import type { ChatSnapshot } from '../shared/types';
import { element } from './dom';

// Same length as the CSS pulse (.unseen-dot in styles.css).
const PULSE_CYCLE_MS: number = 1800;

// The waiting dot pulses faster (WAITING in .unseen-dot.is-waiting).
const WAITING_PULSE_CYCLE_MS: number = 1000;

// A chat waiting on the user's answer gets a bigger, faster dot, so it stands apart from one that simply has a reply
// to read and reads as more urgent: blue for a question, red for an allow-or-deny permission prompt, purple for an
// Orbit approval request (main or a release), a colour no other state uses.
const WAITING_CLASS: string = 'is-waiting';
const KIND_CLASSES: Readonly<Partial<Record<DotKind, string>>> = { permission: 'is-permission', approval: 'is-approval' };

export type DotKind = 'unread' | 'question' | 'permission' | 'approval';

// Cards and rows are rebuilt every poll, so each new dot starts at the wall-clock phase instead of at frame zero, and
// the pulse never visibly restarts.
export function renderUnseenDot(kind: DotKind = 'unread'): HTMLSpanElement {
  const isWaiting: boolean = kind !== 'unread';
  const kindClass: string | undefined = KIND_CLASSES[kind];
  const classes: string[] = ['unseen-dot', ...(isWaiting ? [WAITING_CLASS] : []), ...(kindClass !== undefined ? [kindClass] : [])];
  const dot: HTMLSpanElement = element('span', classes.join(' '));
  dot.style.animationDelay = `-${Date.now() % (isWaiting ? WAITING_PULSE_CYCLE_MS : PULSE_CYCLE_MS)}ms`;
  return dot;
}

// An unread reply is marked until the chat is opened; a question or an approval request is marked until it is
// answered, however often the chat was looked at meanwhile, since seeing it does not answer it. Null when the chat
// has no dot.
export function dotKindOf(chat: ChatSnapshot, hasUnreadReply: boolean): DotKind | null {
  if (chat.approval !== null) return 'approval';
  if (chat.status === 'waiting') return chat.asksPermission === true ? 'permission' : 'question';
  return hasUnreadReply ? 'unread' : null;
}
