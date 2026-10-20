import type { TokenRange } from './draft-image-tokens';

export type SelectionDirection = 'forward' | 'backward' | 'none';

export interface TextSelection {
  readonly start: number;
  readonly end: number;
  readonly direction: SelectionDirection;
}

// How a moved edge that lands inside a marker leaves it: in the way it was moving (arrows, word and line
// jumps), or by the closer edge (a click, or Up/Down, whose sideways landing spot says nothing about intent).
export type SnapBias = 'travel' | 'nearest';

// The selection with no edge inside a marker, so a marker always behaves like one character.
export function snapSelection(ranges: readonly TokenRange[], next: TextSelection, previous: TextSelection, bias: SnapBias): TextSelection {
  if (next.start === next.end) {
    const caret: number = snapCaret(ranges, next.start, focusOf(previous), bias);
    return { start: caret, end: caret, direction: next.direction };
  }
  return snapRange(ranges, next, focusOf(previous), bias);
}

// The edge a keyboard extension moves; the other one stays put.
export function focusOf(selection: TextSelection): number {
  return selection.direction === 'backward' ? selection.start : selection.end;
}

export function markerAround(ranges: readonly TokenRange[], position: number): TokenRange | null {
  return ranges.find((range: TokenRange) => range.start < position && position < range.end) ?? null;
}

function snapCaret(ranges: readonly TokenRange[], caret: number, previousFocus: number, bias: SnapBias): number {
  const marker: TokenRange | null = markerAround(ranges, caret);
  if (marker === null) return caret;
  if (bias === 'travel' && caret < previousFocus) return marker.start;
  if (bias === 'travel' && caret > previousFocus) return marker.end;
  return nearestEdge(marker, caret);
}

// The anchor edge always grows to cover its marker; a range that only touched part of a marker (a double
// click on "Image", a drag) takes all of it. The focus edge follows its travel, so Shift+Left back over a
// selected marker lets it go again.
function snapRange(ranges: readonly TokenRange[], next: TextSelection, previousFocus: number, bias: SnapBias): TextSelection {
  const isBackward: boolean = next.direction === 'backward';
  const focus: number = isBackward ? next.start : next.end;
  const movedFocus: number = bias === 'travel' && focus !== previousFocus ? snapCaret(ranges, focus, previousFocus, bias) : outward(ranges, focus, isBackward);
  const anchor: number = outward(ranges, isBackward ? next.end : next.start, !isBackward);
  const start: number = Math.min(anchor, movedFocus);
  const end: number = Math.max(anchor, movedFocus);
  return { start, end, direction: next.direction };
}

// A selection's start edge leaves a marker by its start, its end edge by its end.
function outward(ranges: readonly TokenRange[], position: number, isStartEdge: boolean): number {
  const marker: TokenRange | null = markerAround(ranges, position);
  if (marker === null) return position;
  return isStartEdge ? marker.start : marker.end;
}

// A tie goes after the marker, where typing would continue.
function nearestEdge(marker: TokenRange, position: number): number {
  return position - marker.start < marker.end - position ? marker.start : marker.end;
}

export function sameSelection(first: TextSelection, second: TextSelection): boolean {
  return first.start === second.start && first.end === second.end;
}
