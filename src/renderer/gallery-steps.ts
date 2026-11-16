// A horizontal drag shorter than this is a tap's jitter, not a swipe to the next picture.
export const SWIPE_MIN_PX: number = 48;

export type GalleryStep = -1 | 0 | 1;

// The gallery stops at either end, as photo viewers do, so the counter never jumps from the last back to 1.
export function steppedIndex(index: number, step: GalleryStep, count: number): number {
  return Math.min(Math.max(index + step, 0), Math.max(count - 1, 0));
}

// Swiping left brings the next picture in from the right, like turning a page.
export function swipeStep(dragX: number): GalleryStep {
  if (Math.abs(dragX) < SWIPE_MIN_PX) return 0;
  return dragX < 0 ? 1 : -1;
}

export function counterText(index: number, count: number): string {
  return `${index + 1} / ${count}`;
}

// The grid's bar names how many pictures it laid out instead of which one is open.
export function totalText(count: number): string {
  return `${count} images`;
}
