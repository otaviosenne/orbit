import { DROP_ZONE_ATTRIBUTE, DROP_ZONE_SELECTOR, SESSION_ATTRIBUTE } from '../views/board-view';
import { isWebHost } from '../host';
import type { BoardZone, DragSource } from './drop-rules';

// Set on the stand-in cards of closed chats (closed pins and suspended chats).
const CLOSED_CARD_CLASS: string = 'is-closed';

// What the drop rules need to know about a picked-up card, read from the board as it is drawn.
export function dragSourceOf(card: HTMLElement, root: HTMLElement): DragSource | null {
  const zone: BoardZone | null = zoneOf(card);
  const sessionId: string | undefined = card.dataset[SESSION_ATTRIBUTE];
  if (zone === null || sessionId === undefined) return null;
  const canSuspend: boolean = !card.classList.contains(CLOSED_CARD_CLASS) && !isWebHost();
  return { zone, isPinned: isPinnedOnBoard(sessionId, root), canSuspend };
}

// The innermost zone, so a card in a column belongs to that column rather than to the columns area around it.
export function zoneOf(node: Element): BoardZone | null {
  const zone: string | undefined = node.closest<HTMLElement>(DROP_ZONE_SELECTOR)?.dataset[DROP_ZONE_ATTRIBUTE];
  return zone === undefined ? null : (zone as BoardZone);
}

function isPinnedOnBoard(sessionId: string, root: HTMLElement): boolean {
  return root.querySelector(`.pinned-row .card[data-${SESSION_ATTRIBUTE}="${CSS.escape(sessionId)}"]`) !== null;
}
