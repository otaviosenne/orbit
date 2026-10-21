import { isNarrowScreen } from './narrow-screen';

// Far enough to be meant, and clearly more sideways than down, so scrolling a column never flips it.
const MIN_SWIPE_PX: number = 60;
const SIDEWAYS_RATIO: number = 1.5;
// Rows that scroll sideways themselves keep their swipes.
const SIDEWAYS_SCROLLERS: string = '.pinned-cards';

export function installColumnSwipe(view: HTMLElement, step: (direction: 1 | -1) => void): void {
  let start: Touch | null = null;
  view.addEventListener('touchstart', (event: TouchEvent): void => {
    const onBoard: boolean = document.body.classList.contains('web-on-board');
    const inScroller: boolean = (event.target as HTMLElement).closest(SIDEWAYS_SCROLLERS) !== null;
    start = onBoard && isNarrowScreen() && !inScroller && event.touches.length === 1 ? (event.touches[0] ?? null) : null;
  }, { passive: true });
  view.addEventListener('touchend', (event: TouchEvent): void => {
    const end: Touch | undefined = event.changedTouches[0];
    if (start === null || end === undefined) return;
    const dx: number = end.clientX - start.clientX;
    const dy: number = end.clientY - start.clientY;
    start = null;
    if (Math.abs(dx) >= MIN_SWIPE_PX && Math.abs(dx) >= SIDEWAYS_RATIO * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  }, { passive: true });
}
