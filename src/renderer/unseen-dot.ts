import { element } from './dom';

// Same length as the CSS pulse (.unseen-dot in styles.css).
const PULSE_CYCLE_MS: number = 1800;

// A chat waiting on the user's answer (a question or a permission) gets the darker dot, so it stands apart from one
// that simply has a reply to read.
const WAITING_CLASS: string = 'is-waiting';

// The green "unread reply" dot. Cards and rows are rebuilt every poll, so each new dot starts at the wall-clock phase
// instead of at frame zero, and the pulse never visibly restarts.
export function renderUnseenDot(isWaiting: boolean = false): HTMLSpanElement {
  const dot: HTMLSpanElement = element('span', `unseen-dot${isWaiting ? ` ${WAITING_CLASS}` : ''}`);
  dot.style.animationDelay = `-${Date.now() % PULSE_CYCLE_MS}ms`;
  return dot;
}
