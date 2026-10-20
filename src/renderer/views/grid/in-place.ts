import { renderSpinner } from '../../spinner';

// Grid elements live across polls; writing the same text again would still reset a selection inside it.
export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

// Keeps a running spinner instead of replacing it, so its animation never restarts while the chat works.
export function showSpinner(slot: HTMLElement, isBusy: boolean): void {
  if (isBusy && slot.childElementCount === 0) slot.append(renderSpinner());
  if (!isBusy && slot.childElementCount > 0) slot.replaceChildren();
}
