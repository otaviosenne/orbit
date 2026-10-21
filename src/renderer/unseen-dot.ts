import { element } from './dom';

// Same length as the CSS pulse (.unseen-dot in styles.css).
const PULSE_CYCLE_MS: number = 1800;

// The green "unread reply" dot. Cards and rows are rebuilt every poll, so each new dot starts at the wall-clock phase
// instead of at frame zero, and the pulse never visibly restarts.
export function renderUnseenDot(): HTMLSpanElement {
  const dot: HTMLSpanElement = element('span', 'unseen-dot');
  dot.style.animationDelay = `-${Date.now() % PULSE_CYCLE_MS}ms`;
  return dot;
}
