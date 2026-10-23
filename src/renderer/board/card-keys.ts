import type { DropAction } from './drop-rules';

// A pinned chat has two cards, the Pinned row's and its column's, so a card is known by its area and its chat.
export type CardArea = 'board' | 'pinned';

export function cardKeyFor(area: CardArea, sessionId: string): string {
  return `${area}:${sessionId}`;
}

// The card a drop brings into its new place: the new Pinned copy for a pin, the column card otherwise.
export function landingCardKey(sessionId: string, action: DropAction): string | null {
  if (action.kind === 'none') return null;
  const isPinnedArea: boolean = action.kind === 'pin' || (action.kind === 'reorder' && action.zone === 'pinned');
  return cardKeyFor(isPinnedArea ? 'pinned' : 'board', sessionId);
}
