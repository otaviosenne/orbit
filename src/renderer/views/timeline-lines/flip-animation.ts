import { flipOffsets } from './flip-offsets';

const MOVE_MS: number = 420;
const MOVE_EASING: string = 'cubic-bezier(0.2, 0, 0, 1)';
// Sub-pixel shifts from rounding are not moves; animating them would only make the lanes shimmer.
const MIN_MOVE_PX: number = 1;
const REDUCED_MOTION: string = '(prefers-reduced-motion: reduce)';

// Where each element is seen now, including any glide still in flight, so a move interrupted by the next poll
// carries on from where it is instead of snapping.
export function measureTops(elements: ReadonlyMap<string, HTMLElement>): Map<string, number> {
  return collectTops(elements, (node: HTMLElement): number => node.getBoundingClientRect().top);
}

// Where each element now sits in the layout, leaving out a glide still in flight.
function measureSlots(elements: ReadonlyMap<string, HTMLElement>): Map<string, number> {
  return collectTops(elements, (node: HTMLElement): number => node.getBoundingClientRect().top - new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);
}

function collectTops(elements: ReadonlyMap<string, HTMLElement>, topOf: (node: HTMLElement) => number): Map<string, number> {
  const tops: Map<string, number> = new Map();
  elements.forEach((node: HTMLElement, key: string): void => {
    if (node.isConnected) tops.set(key, topOf(node));
  });
  return tops;
}

// Each element that moved jumps back to where it was seen and glides into its new place.
export function animateMoves(elements: ReadonlyMap<string, HTMLElement>, before: ReadonlyMap<string, number>): void {
  if (matchMedia(REDUCED_MOTION).matches) return;
  flipOffsets(before, measureSlots(elements), MIN_MOVE_PX).forEach((offset: number, key: string): void => {
    const node: HTMLElement | undefined = elements.get(key);
    if (node !== undefined) glideFrom(node, offset);
  });
}

function glideFrom(node: HTMLElement, offset: number): void {
  node.style.transition = 'none';
  node.style.transform = `translateY(${offset}px)`;
  // Reading layout commits the offset before the transition is set; requestAnimationFrame would not run in a
  // window that is not being painted, and the lane would then jump.
  void node.offsetHeight;
  node.style.transition = `transform ${MOVE_MS}ms ${MOVE_EASING}`;
  node.style.transform = '';
}
