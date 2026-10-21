import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreadScroller } from '../src/renderer/sheet/thread-scroller';

const VIEW_PX: number = 500;
const CONTENT_PX: number = 5000;
const STEP_PX: number = 50;

let frames: (() => void)[] = [];

function fakeThread(scrollTop: number): HTMLElement {
  return { clientHeight: VIEW_PX, scrollHeight: CONTENT_PX, scrollTop, addEventListener: (): void => undefined } as unknown as HTMLElement;
}

function runFrames(): void {
  for (let guard: number = 0; frames.length > 0 && guard < 200; guard++) frames.shift()?.();
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: () => void): number => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', (): void => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThreadScroller', () => {
  it('moves a tenth of the view per press', () => {
    const thread: HTMLElement = fakeThread(1000);
    new ThreadScroller(thread).step('down');
    runFrames();
    expect(thread.scrollTop).toBe(1000 + STEP_PX);
  });

  it('adds up quick presses into one glide', () => {
    const thread: HTMLElement = fakeThread(1000);
    const scroller: ThreadScroller = new ThreadScroller(thread);
    for (let press: number = 0; press < 5; press++) scroller.step('up');
    runFrames();
    expect(thread.scrollTop).toBe(1000 - 5 * STEP_PX);
  });

  it('stops at the top and bottom', () => {
    const top: HTMLElement = fakeThread(20);
    new ThreadScroller(top).step('up');
    runFrames();
    expect(top.scrollTop).toBe(0);
    const bottom: HTMLElement = fakeThread(CONTENT_PX - VIEW_PX - 10);
    new ThreadScroller(bottom).step('down');
    runFrames();
    expect(bottom.scrollTop).toBe(CONTENT_PX - VIEW_PX);
  });

  it('settles within a few frames', () => {
    const thread: HTMLElement = fakeThread(1000);
    new ThreadScroller(thread).step('down');
    let count: number = 0;
    while (frames.length > 0) {
      frames.shift()?.();
      count += 1;
    }
    expect(count).toBeLessThanOrEqual(12);
  });
});
