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

export interface GridShape {
  readonly columns: number;
  readonly rows: number;
}

// As close to square as the count allows, so a few pictures fill the screen instead of one row of small tiles;
// a phone keeps at most two side by side.
export function gridShape(count: number, maxColumns: number): GridShape {
  const columns: number = Math.max(1, Math.min(Math.ceil(Math.sqrt(count)), maxColumns));
  return { columns, rows: Math.max(1, Math.ceil(count / columns)) };
}

// The grid button cycles one picture → all of them in a grid → all of them in one tall row scrolled sideways → back.
export type GalleryLayout = 'single' | 'grid' | 'row';

const LAYOUT_CYCLE: readonly GalleryLayout[] = ['single', 'grid', 'row'];

export function nextLayout(layout: GalleryLayout): GalleryLayout {
  return LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(layout) + 1) % LAYOUT_CYCLE.length] ?? 'single';
}

// Sub-pixel scroll widths leave a row a fraction short of its end; within this it counts as the end.
const ROW_END_TOLERANCE_PX: number = 1;

export interface RowEnds {
  readonly atStart: boolean;
  readonly atEnd: boolean;
}

// Which of the row's arrows has nowhere left to go.
export function rowEnds(scrollLeft: number, visibleWidth: number, scrollWidth: number): RowEnds {
  return { atStart: scrollLeft <= ROW_END_TOLERANCE_PX, atEnd: scrollLeft + visibleWidth >= scrollWidth - ROW_END_TOLERANCE_PX };
}
