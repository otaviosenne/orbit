// iPhone's back gesture: a drag that starts at the screen's left edge and moves right takes the chat away.

// Wide enough for a thumb, narrow enough that touches on the thread's own content start elsewhere.
export const EDGE_ZONE_PX: number = 24;
// A finger moves this far before the gesture is read as sideways or as a scroll.
const DIRECTION_SLOP_PX: number = 10;
// Released past this share of the width, the chat goes; short of it, it springs back.
const CLOSE_FRACTION: number = 1 / 3;
// A flick this fast closes (or cancels) whatever the distance, like UIKit's back swipe.
const FLICK_PX_PER_MS: number = 0.5;

export type SwipeIntent = 'undecided' | 'back' | 'scroll';

export function startsAtEdge(x: number): boolean {
  return x >= 0 && x <= EDGE_ZONE_PX;
}

// Rightward and more sideways than down: the back gesture. Anything else belongs to the page's own scrolling.
export function swipeIntent(dx: number, dy: number): SwipeIntent {
  if (Math.hypot(dx, dy) < DIRECTION_SLOP_PX) return 'undecided';
  return dx > 0 && dx > Math.abs(dy) ? 'back' : 'scroll';
}

// velocity: px per ms at release, positive toward the right.
export function finishesBack(dx: number, width: number, velocity: number): boolean {
  if (velocity >= FLICK_PX_PER_MS) return true;
  if (velocity <= -FLICK_PX_PER_MS) return false;
  return dx >= width * CLOSE_FRACTION;
}

export interface SwipeSample {
  readonly x: number;
  readonly time: number;
}

// A finger that rested this long before lifting was not flicking.
const STILL_BEFORE_RELEASE_MS: number = 100;

// From the last two samples rather than the whole drag, so only how the finger left counts.
export function releaseVelocity(previous: SwipeSample, last: SwipeSample, releasedAt: number): number {
  const elapsed: number = last.time - previous.time;
  if (elapsed <= 0 || releasedAt - last.time > STILL_BEFORE_RELEASE_MS) return 0;
  return (last.x - previous.x) / elapsed;
}
