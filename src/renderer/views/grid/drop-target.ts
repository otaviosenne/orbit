export interface Point {
  readonly x: number;
  readonly y: number;
}

// A tile's slot, in the same coordinates as the pointer.
export interface SlotRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

// The slot the dragged tile would land in: the one under the pointer, or else the nearest one, so the gaps
// between tiles and the space past the last row still have a clear answer. Null only when there are no slots.
export function dropIndexAt(slots: readonly SlotRect[], point: Point): number | null {
  const hit: number = slots.findIndex((slot: SlotRect) => contains(slot, point));
  if (hit !== -1) return hit;
  return nearestIndex(slots, point);
}

function contains(slot: SlotRect, point: Point): boolean {
  return point.x >= slot.left && point.x < slot.right && point.y >= slot.top && point.y < slot.bottom;
}

function nearestIndex(slots: readonly SlotRect[], point: Point): number | null {
  let best: number | null = null;
  let bestDistance: number = Number.POSITIVE_INFINITY;
  slots.forEach((slot: SlotRect, index: number): void => {
    const distance: number = distanceToCenter(slot, point);
    if (distance >= bestDistance) return;
    best = index;
    bestDistance = distance;
  });
  return best;
}

function distanceToCenter(slot: SlotRect, point: Point): number {
  const centerX: number = (slot.left + slot.right) / 2;
  const centerY: number = (slot.top + slot.bottom) / 2;
  return Math.hypot(point.x - centerX, point.y - centerY);
}
