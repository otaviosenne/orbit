// Where in a section a dragged card would land: next to the card nearest the pointer.
export interface ReorderTarget {
  readonly sessionId: string;
  readonly placement: 'before' | 'after';
}

export interface ReorderCandidate {
  readonly sessionId: string;
  readonly box: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
}

// A column is a list read downwards; Pinned and Suspended wrap sideways like text.
export type ReorderAxis = 'vertical' | 'horizontal';

export function reorderTarget(candidates: readonly ReorderCandidate[], x: number, y: number, axis: ReorderAxis): ReorderTarget | null {
  let nearest: ReorderCandidate | null = null;
  let nearestDistance: number = Infinity;
  for (const candidate of candidates) {
    const distance: number = distanceTo(candidate.box, x, y);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  if (nearest === null) return null;
  const isBefore: boolean = axis === 'vertical' ? y < middle(nearest.box.top, nearest.box.bottom) : x < middle(nearest.box.left, nearest.box.right);
  return { sessionId: nearest.sessionId, placement: isBefore ? 'before' : 'after' };
}

// The order after taking a card out and putting it next to the target; unchanged if the target is unknown.
export function moveInOrder(order: readonly string[], draggedId: string, target: ReorderTarget): string[] {
  const rest: string[] = order.filter((sessionId: string) => sessionId !== draggedId);
  const at: number = rest.indexOf(target.sessionId);
  if (at === -1) return [...order];
  rest.splice(target.placement === 'before' ? at : at + 1, 0, draggedId);
  return rest;
}

function distanceTo(box: ReorderCandidate['box'], x: number, y: number): number {
  const dx: number = Math.max(box.left - x, 0, x - box.right);
  const dy: number = Math.max(box.top - y, 0, y - box.bottom);
  return Math.hypot(dx, dy);
}

function middle(from: number, to: number): number {
  return (from + to) / 2;
}
