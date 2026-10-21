// A picker needs room for its tabs, the question, a few options and its footer; smaller, the cursor row can fall
// off screen and the picker cannot be driven blind. These are the smallest sizes that hold a typical picker.
export const MIN_PICKER_COLUMNS: number = 60;
export const MIN_PICKER_LINES: number = 30;
// Beyond this the text is too small to be any use to the user watching their window.
const MAX_SHRINK: number = 6;
// Font sizes are applied in tenths, which is as fine as kitty steps them.
const SCALE_STEP: number = 10;

export interface TerminalSize {
  readonly columns: number;
  readonly lines: number;
}

// How many times the font must shrink so the terminal holds a picker; 1 when it already does.
export function pickerShrinkFactor(size: TerminalSize): number {
  if (size.columns <= 0 || size.lines <= 0) return 1;
  const needed: number = Math.max(MIN_PICKER_COLUMNS / size.columns, MIN_PICKER_LINES / size.lines, 1);
  return Math.min(Math.ceil(needed * SCALE_STEP) / SCALE_STEP, MAX_SHRINK);
}
