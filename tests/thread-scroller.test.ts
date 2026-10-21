import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreadScroller } from '../src/renderer/sheet/thread-scroller';

const VIEW_PX: number = 500;
const CONTENT_PX: number = 5000;
const STEP_PX: number = 50;

let frames: (() => void)[] = [];

// Clamps scrollTop like a real scroller, so the glide sees when it hits an end.
function fakeThread(start: number, contentPx: number = CONTENT_PX): HTMLElement & { content: number } {
  let top: number = start;
  const thread = {
    clientHeight: VIEW_PX,
    content: contentPx,
    get scrollHeight(): number {
      return this.content;
    },
    get scrollTop(): number {
      return top;
    },
    set scrollTop(value: number) {
      top = Math.min(Math.max(Math.round(value), 0), this.content - VIEW_PX);
    },
    addEventListener: (): void => undefined,
  };
  return thread as unknown as HTMLElement & { content: number };
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

describe('ThreadScroller with older pages loading above', () => {
  it('travels only the pressed distance when the thread shifts to keep its place', () => {
    const thread = fakeThread(100);
    new ThreadScroller(thread).step('up');
    // An older page lands above the view mid-glide; the feed moves scrollTop down by its height to keep the place.
    frames.shift()?.();
    const loadedPx: number = 2000;
    thread.content += loadedPx;
    thread.scrollTop += loadedPx;
    const afterLoad: number = thread.scrollTop;
    runFrames();
    expect(afterLoad - thread.scrollTop).toBeLessThanOrEqual(STEP_PX);
    expect(frames).toHaveLength(0);
  });
});
