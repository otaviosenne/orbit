export type FocusDirection = 'up' | 'down' | 'left' | 'right';

export interface FocusBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface FocusCandidate {
  readonly key: string;
  readonly box: FocusBox;
  // Which band of the board it sits in (the Pinned row, the columns): left and right stay in their band.
  readonly area: string;
}

// Sub-pixel layout can leave boxes that touch a hair apart or overlapping.
const EDGE_TOLERANCE_PX: number = 1;
// Off to the side counts this much more than straight ahead, so a move leaves its row or column only when
// nothing lies straight ahead.
const OFF_AXIS_WEIGHT: number = 3;
const HALF: number = 2;

const isVertical = (direction: FocusDirection): boolean => direction === 'up' || direction === 'down';

function centerX(box: FocusBox): number {
  return (box.left + box.right) / HALF;
}

function centerY(box: FocusBox): number {
  return (box.top + box.bottom) / HALF;
}

function overlapsHorizontally(a: FocusBox, b: FocusBox): boolean {
  return a.left < b.right - EDGE_TOLERANCE_PX && b.left < a.right - EDGE_TOLERANCE_PX;
}

// How far ahead a box lies in the direction of the move; negative or zero when it is not ahead at all.
function distanceAhead(from: FocusBox, to: FocusBox, direction: FocusDirection): number {
  if (direction === 'up') return centerY(from) - centerY(to);
  if (direction === 'down') return centerY(to) - centerY(from);
  if (direction === 'left') return from.left - to.right + EDGE_TOLERANCE_PX;
  return to.left - from.right + EDGE_TOLERANCE_PX;
}

function offAxis(from: FocusBox, to: FocusBox, direction: FocusDirection): number {
  return isVertical(direction) ? Math.abs(centerX(to) - centerX(from)) : Math.abs(centerY(to) - centerY(from));
}

function closest(candidates: readonly FocusCandidate[], score: (candidate: FocusCandidate) => number): FocusCandidate | null {
  return candidates.reduce<FocusCandidate | null>((best: FocusCandidate | null, candidate: FocusCandidate) => (best === null || score(candidate) < score(best) ? candidate : best), null);
}

// Up and down stay in the card's own column while it has cards that way. Past its end they cross into another
// band (the Pinned row above, the columns below it) but never into a neighbouring column.
function nextVertically(from: FocusCandidate, ahead: readonly FocusCandidate[], direction: FocusDirection): FocusCandidate | null {
  const sameColumn: readonly FocusCandidate[] = ahead.filter((candidate: FocusCandidate) => overlapsHorizontally(from.box, candidate.box));
  if (sameColumn.length > 0) return closest(sameColumn, (candidate: FocusCandidate) => distanceAhead(from.box, candidate.box, direction));
  const otherArea: readonly FocusCandidate[] = ahead.filter((candidate: FocusCandidate) => candidate.area !== from.area);
  return closest(otherArea, (candidate: FocusCandidate) => distanceAhead(from.box, candidate.box, direction) + OFF_AXIS_WEIGHT * offAxis(from.box, candidate.box, direction));
}

// Left and right go to the nearest column that way, then to the card in it closest in height; they stay in
// the card's own band while it has cards that way, so the column next door wins over a pinned card above.
function nextSideways(from: FocusCandidate, ahead: readonly FocusCandidate[], direction: FocusDirection): FocusCandidate | null {
  const sameArea: readonly FocusCandidate[] = ahead.filter((candidate: FocusCandidate) => candidate.area === from.area);
  return nearestColumnCard(from.box, sameArea.length > 0 ? sameArea : ahead, direction);
}

function nearestColumnCard(from: FocusBox, ahead: readonly FocusCandidate[], direction: FocusDirection): FocusCandidate | null {
  const nearest: FocusCandidate | null = closest(ahead, (candidate: FocusCandidate) => distanceAhead(from, candidate.box, direction));
  if (nearest === null) return null;
  const column: readonly FocusCandidate[] = ahead.filter((candidate: FocusCandidate) => overlapsHorizontally(nearest.box, candidate.box));
  return closest(column, (candidate: FocusCandidate) => offAxis(from, candidate.box, direction));
}

export function nextInDirection(from: FocusCandidate, candidates: readonly FocusCandidate[], direction: FocusDirection): FocusCandidate | null {
  const ahead: readonly FocusCandidate[] = candidates.filter((candidate: FocusCandidate) => distanceAhead(from.box, candidate.box, direction) > 0);
  return isVertical(direction) ? nextVertically(from, ahead, direction) : nextSideways(from, ahead, direction);
}

// Where focus starts: the top-left card, as the board reads.
export function firstInReadingOrder(candidates: readonly FocusCandidate[]): FocusCandidate | null {
  const top: number = Math.min(...candidates.map((candidate: FocusCandidate) => candidate.box.top));
  const topRow: readonly FocusCandidate[] = candidates.filter((candidate: FocusCandidate) => candidate.box.top - top < EDGE_TOLERANCE_PX);
  return closest(topRow, (candidate: FocusCandidate) => candidate.box.left);
}
