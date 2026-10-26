import { renderWorkSpinner } from '../../spinner';
import type { WorkState } from '../../work-state';

// Grid elements live across polls; writing the same text again would still reset a selection inside it.
export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

// Keeps a running spinner instead of replacing it, so its animation never restarts while the chat works.
export function showSpinner(slot: HTMLElement, state: WorkState): void {
  if (shownState(slot) === state) return;
  const spinner: HTMLElement | null = renderWorkSpinner(state);
  slot.replaceChildren(...(spinner === null ? [] : [spinner]));
}

function shownState(slot: HTMLElement): WorkState {
  if (slot.firstElementChild === null) return 'resting';
  return slot.firstElementChild.classList.contains('is-shell') ? 'shell-only' : 'working';
}
