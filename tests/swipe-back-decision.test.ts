import { describe, expect, it } from 'vitest';
import { EDGE_ZONE_PX, finishesBack, releaseVelocity, startsAtEdge, swipeIntent } from '../src/web/mobile/swipe-back-decision';

const PHONE_WIDTH: number = 390;
const SLOW: number = 0.1;
const FLICK: number = 0.8;

describe('swipe back from the left edge', () => {
  it('starts only within the edge zone', () => {
    expect(startsAtEdge(0)).toBe(true);
    expect(startsAtEdge(EDGE_ZONE_PX)).toBe(true);
    expect(startsAtEdge(EDGE_ZONE_PX + 1)).toBe(false);
  });

  it('waits for a few pixels, then tells a rightward drag from a scroll', () => {
    expect(swipeIntent(3, 2)).toBe('undecided');
    expect(swipeIntent(30, 8)).toBe('back');
    expect(swipeIntent(8, 30)).toBe('scroll');
    expect(swipeIntent(-30, 0)).toBe('scroll');
  });

  it('closes past a third of the width and springs back short of it', () => {
    expect(finishesBack(PHONE_WIDTH / 3 + 1, PHONE_WIDTH, SLOW)).toBe(true);
    expect(finishesBack(PHONE_WIDTH / 3 - 1, PHONE_WIDTH, SLOW)).toBe(false);
  });

  it('lets a flick decide whatever the distance', () => {
    expect(finishesBack(40, PHONE_WIDTH, FLICK)).toBe(true);
    expect(finishesBack(300, PHONE_WIDTH, -FLICK)).toBe(false);
  });

  it('measures how the finger left, and ignores one that rested before lifting', () => {
    expect(releaseVelocity({ x: 100, time: 0 }, { x: 120, time: 10 }, 20)).toBe(2);
    expect(releaseVelocity({ x: 100, time: 0 }, { x: 120, time: 10 }, 400)).toBe(0);
    expect(releaseVelocity({ x: 100, time: 10 }, { x: 100, time: 10 }, 10)).toBe(0);
  });
});
