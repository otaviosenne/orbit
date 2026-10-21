// What the key counts depend on: how many options the tab lists and whether several may be ticked; previews
// decide whether an answer of one's own is offered.
export interface PickerShape {
  readonly options: readonly unknown[];
  readonly multiSelect: boolean;
  readonly hasPreviews?: boolean;
}

// One input to Claude Code's question picker: named keys go through `kitty @ send-key`, text through send-text.
export type PickerStep = { readonly kind: 'keys'; readonly keys: readonly string[] } | { readonly kind: 'text'; readonly text: string };

// Rows under the options: "Type something", the multi-select "Submit" row, and "Chat about this" at the bottom.
const ROWS_BELOW_OPTIONS_SINGLE: number = 2;
const ROWS_BELOW_OPTIONS_MULTI: number = 3;
// Below the options the "Type something" field comes first; from the bottom, single-select reaches it in one step up.
const FIELD_ROWS_ABOVE_BOTTOM_SINGLE: number = 1;
const FIELD_ROWS_ABOVE_BOTTOM_MULTI: number = 2;
// Ctrl+U clears the "Type something" field back from the caret (and unticks it in a multi-select), Ctrl+K forward.
const CLEAR_BEFORE_CARET: string = 'ctrl+u';
const CLEAR_AFTER_CARET: string = 'ctrl+k';
// Each press clears only one wrapped line, a narrow window wraps the field over many, and coming back to the field
// may leave the caret anywhere in it; spare presses on an empty field do nothing.
const MAX_FIELD_LINES: number = 40;
// The review step lists "1. Submit answers" first.
const SUBMIT_ANSWERS_DIGIT: string = '1';

export function keys(name: string, times: number = 1): PickerStep {
  return { kind: 'keys', keys: repeated(name, times) };
}

export function text(value: string): PickerStep {
  return { kind: 'text', text: value };
}

// Option numbers are typed as digits; they only act while the cursor sits on an option row.
export function optionDigit(index: number): string {
  return String(index + 1);
}

// Down never wraps: this many presses always parks the cursor on "Chat about this", out of any text field.
export function rowCount(question: PickerShape): number {
  return question.options.length + rowsBelowOptions(question);
}

export function parkAtBottom(question: PickerShape): PickerStep {
  return keys('down', rowCount(question));
}

// Up wraps from the first option to the field, so the climb from the bottom row must be exact.
export function climbToFirstOption(question: PickerShape): PickerStep {
  return keys('up', rowCount(question) - 1);
}

export function climbToField(question: PickerShape): PickerStep {
  return keys('up', question.multiSelect ? FIELD_ROWS_ABOVE_BOTTOM_MULTI : FIELD_ROWS_ABOVE_BOTTOM_SINGLE);
}

export function clearField(): PickerStep {
  return { kind: 'keys', keys: [...repeated(CLEAR_BEFORE_CARET, MAX_FIELD_LINES), ...repeated(CLEAR_AFTER_CARET, MAX_FIELD_LINES)] };
}

export function submitReview(): PickerStep {
  return text(SUBMIT_ANSWERS_DIGIT);
}

function repeated(name: string, times: number): string[] {
  return Array.from({ length: times }, (): string => name);
}

function rowsBelowOptions(question: PickerShape): number {
  return question.multiSelect ? ROWS_BELOW_OPTIONS_MULTI : ROWS_BELOW_OPTIONS_SINGLE;
}

// Orbit offers no "Other" for options with previews: a wide window draws them without the "Type something" field.
export function offersOther(question: PickerShape): boolean {
  return question.hasPreviews !== true;
}
