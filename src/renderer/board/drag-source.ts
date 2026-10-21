import type { ColumnKey } from '../views/board-columns';
import { DROP_ZONE_ATTRIBUTE, DROP_ZONE_SELECTOR, SESSION_ATTRIBUTE } from '../views/board-view';
import type { BoardZone, DragSource } from './drop-rules';

// What the drop rules need to know about a picked-up card, read from the board as it is drawn.
export function dragSourceOf(card: HTMLElement, root: HTMLElement): DragSource | null {
  const zone: BoardZone | null = zoneOf(card);
  const sessionId: string | undefined = card.dataset[SESSION_ATTRIBUTE];
  if (zone === null || sessionId === undefined) return null;
  return { zone, column: liveColumnOf(sessionId, root), isPinned: isPinnedOnBoard(sessionId, root) };
}

export function zoneOf(node: Element): BoardZone | null {
  const zone: string | undefined = node.closest<HTMLElement>(DROP_ZONE_SELECTOR)?.dataset[DROP_ZONE_ATTRIBUTE];
  return zone === undefined ? null : (zone as BoardZone);
}

// A closed pinned chat has only its Pinned row card, so it has no column.
function liveColumnOf(sessionId: string, root: HTMLElement): ColumnKey | null {
  const card: HTMLElement | null = root.querySelector<HTMLElement>(`.column ${cardSelector(sessionId)}`);
  const zone: BoardZone | null = card === null ? null : zoneOf(card);
  return zone === 'pinned' ? null : zone;
}

function isPinnedOnBoard(sessionId: string, root: HTMLElement): boolean {
  return root.querySelector(`.pinned-row ${cardSelector(sessionId)}`) !== null;
}

function cardSelector(sessionId: string): string {
  return `.card[data-${SESSION_ATTRIBUTE}="${CSS.escape(sessionId)}"]`;
}
