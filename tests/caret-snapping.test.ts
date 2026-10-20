import { describe, expect, it } from 'vitest';
import type { TextSelection } from '../src/renderer/sheet/caret-snapping';
import { snapSelection } from '../src/renderer/sheet/caret-snapping';
import type { TokenRange } from '../src/renderer/sheet/draft-image-tokens';
import { tokenRanges } from '../src/renderer/sheet/draft-image-tokens';

// "hi [Image #1] there": the marker spans 3..13.
const RANGES: TokenRange[] = tokenRanges('hi [Image #1] there');
const MARKER_START: number = 3;
const MARKER_END: number = 13;

function caret(position: number): TextSelection {
  return { start: position, end: position, direction: 'none' };
}

function range(start: number, end: number, direction: TextSelection['direction']): TextSelection {
  return { start, end, direction };
}

describe('snapSelection with a caret', () => {
  it('jumps to the marker start when moving left into it', () => {
    expect(snapSelection(RANGES, caret(MARKER_END - 1), caret(MARKER_END), 'travel')).toEqual(caret(MARKER_START));
  });

  it('jumps to the marker end when moving right into it', () => {
    expect(snapSelection(RANGES, caret(MARKER_START + 1), caret(MARKER_START), 'travel')).toEqual(caret(MARKER_END));
  });

  it('follows a word jump that stopped inside the marker', () => {
    expect(snapSelection(RANGES, caret(MARKER_START + 6), caret(0), 'travel')).toEqual(caret(MARKER_END));
    expect(snapSelection(RANGES, caret(MARKER_START + 7), caret(19), 'travel')).toEqual(caret(MARKER_START));
  });

  it('lands a click or a vertical move on the nearer edge', () => {
    expect(snapSelection(RANGES, caret(MARKER_START + 2), caret(19), 'nearest')).toEqual(caret(MARKER_START));
    expect(snapSelection(RANGES, caret(MARKER_END - 2), caret(0), 'nearest')).toEqual(caret(MARKER_END));
  });

  it('leaves a caret on a marker edge or in plain text alone', () => {
    expect(snapSelection(RANGES, caret(MARKER_START), caret(0), 'travel')).toEqual(caret(MARKER_START));
    expect(snapSelection(RANGES, caret(MARKER_END), caret(19), 'travel')).toEqual(caret(MARKER_END));
    expect(snapSelection(RANGES, caret(1), caret(0), 'travel')).toEqual(caret(1));
  });

  it('takes the nearer edge when the caret did not move', () => {
    expect(snapSelection(RANGES, caret(MARKER_START + 1), caret(MARKER_START + 1), 'travel')).toEqual(caret(MARKER_START));
  });
});

describe('snapSelection with a range', () => {
  it('selects the whole marker with Shift+Left from after it', () => {
    const next: TextSelection = range(MARKER_END - 1, MARKER_END, 'backward');
    expect(snapSelection(RANGES, next, caret(MARKER_END), 'travel')).toEqual(range(MARKER_START, MARKER_END, 'backward'));
  });

  it('selects the whole marker with Shift+Right from before it', () => {
    const next: TextSelection = range(MARKER_START, MARKER_START + 1, 'forward');
    expect(snapSelection(RANGES, next, caret(MARKER_START), 'travel')).toEqual(range(MARKER_START, MARKER_END, 'forward'));
  });

  it('lets the marker go again when Shift+Arrow travels back over it', () => {
    const previous: TextSelection = range(MARKER_START, MARKER_END, 'forward');
    const next: TextSelection = range(MARKER_START, MARKER_END - 1, 'forward');
    expect(snapSelection(RANGES, next, previous, 'travel')).toEqual(range(MARKER_START, MARKER_START, 'forward'));
  });

  it('keeps the plain text of an extended selection and adds the whole marker', () => {
    const next: TextSelection = range(0, MARKER_START + 4, 'forward');
    expect(snapSelection(RANGES, next, range(0, MARKER_START, 'forward'), 'travel')).toEqual(range(0, MARKER_END, 'forward'));
  });

  it('grows a double click or a drag inside a marker to the whole marker', () => {
    const next: TextSelection = range(MARKER_START + 1, MARKER_START + 6, 'none');
    expect(snapSelection(RANGES, next, caret(0), 'nearest')).toEqual(range(MARKER_START, MARKER_END, 'none'));
  });

  it('grows a drag that ends inside a marker over it', () => {
    const next: TextSelection = range(1, MARKER_START + 2, 'forward');
    expect(snapSelection(RANGES, next, caret(1), 'nearest')).toEqual(range(1, MARKER_END, 'forward'));
  });
});
