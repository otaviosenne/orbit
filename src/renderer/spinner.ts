import { element } from './dom';
import type { WorkState } from './work-state';

// Same length as the CSS animation in styles.css (.claude-spinner).
const SPIN_CYCLE_MS: number = 1200;
// The class that tints each state's spinner; plain working keeps Claude's orange.
export const SPINNER_TINTS: Readonly<Record<Exclude<WorkState, 'resting'>, string>> = {
  'working': '',
  'local-ci': 'is-local-ci',
  'shell-only': 'is-shell',
};

// Claude Code's working asterisk (· ✢ ✳ ✶ ✻ ✽). Cards are rebuilt every poll, so each new one starts
// at the wall-clock phase instead of frame zero, and the animation never visibly restarts.
export function renderSpinner(state: Exclude<WorkState, 'resting'> = 'working'): HTMLElement {
  const spinner: HTMLSpanElement = element('span', `claude-spinner ${SPINNER_TINTS[state]}`.trim());
  spinner.setAttribute('aria-hidden', 'true');
  spinner.style.animationDelay = `-${Date.now() % SPIN_CYCLE_MS}ms`;
  return spinner;
}

// The spinner a chat shows, or null when it is not working.
export function renderWorkSpinner(state: WorkState): HTMLElement | null {
  return state === 'resting' ? null : renderSpinner(state);
}
