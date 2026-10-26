import type { ChatStatus } from '../shared/types';
import { element } from './dom';

// Same length as the CSS pulse (.unseen-dot in styles.css).
const PULSE_CYCLE_MS: number = 1800;

// The waiting dot pulses faster (WAITING in .unseen-dot.is-waiting).
const WAITING_PULSE_CYCLE_MS: number = 1000;

// A chat waiting on the user's answer (a question or a permission) gets a blue, faster dot, so it stands apart from
// one that simply has a reply to read and reads as more urgent.
const WAITING_CLASS: string = 'is-waiting';

// The green "unread reply" dot, or the blue "needs your answer" one. Cards and rows are rebuilt every poll, so each new dot starts at the wall-clock phase
// instead of at frame zero, and the pulse never visibly restarts.
export function renderUnseenDot(isWaiting: boolean = false): HTMLSpanElement {
  const dot: HTMLSpanElement = element('span', `unseen-dot${isWaiting ? ` ${WAITING_CLASS}` : ''}`);
  dot.style.animationDelay = `-${Date.now() % (isWaiting ? WAITING_PULSE_CYCLE_MS : PULSE_CYCLE_MS)}ms`;
  return dot;
}

// An unread reply is marked until the chat is opened; a question is marked until it is answered, however often the
// chat was looked at meanwhile, since seeing it does not answer it.
export function showsDot(status: ChatStatus, hasUnreadReply: boolean): boolean {
  return hasUnreadReply || status === 'waiting';
}
