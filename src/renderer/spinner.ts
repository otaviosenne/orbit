import { element } from './dom';

// Same length as the CSS animation in styles.css (.claude-spinner).
const SPIN_CYCLE_MS: number = 1200;

// Claude Code's working asterisk (· ✢ ✳ ✶ ✻ ✽). Cards are rebuilt every poll, so each new one starts
// at the wall-clock phase instead of frame zero, and the animation never visibly restarts.
export function renderSpinner(): HTMLElement {
  const spinner: HTMLSpanElement = element('span', 'claude-spinner');
  spinner.setAttribute('aria-hidden', 'true');
  spinner.style.animationDelay = `-${Date.now() % SPIN_CYCLE_MS}ms`;
  return spinner;
}
