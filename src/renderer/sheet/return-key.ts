const RETURN_KEY: string = 'Enter';
// What the on-screen keyboard labels its return key: a plain return, not "send".
const NEW_LINE_HINT: string = 'enter';

export type ReturnKeyAction = 'send' | 'new-line' | 'other';

export interface KeyPress {
  readonly key: string;
  readonly shiftKey: boolean;
}

// At a desk Enter sends and Shift+Enter adds a line. On a phone's screen keyboard there is no Shift+Enter and a
// stray tap of return would send a half-written prompt, so return always adds a line and only Send sends.
export function returnKeyAction(press: KeyPress, isTouchKeyboard: boolean): ReturnKeyAction {
  if (press.key !== RETURN_KEY) return 'other';
  return press.shiftKey || isTouchKeyboard ? 'new-line' : 'send';
}

// The keyboard's return key then reads as a new line instead of a send arrow.
export function showNewLineReturnKey(input: HTMLTextAreaElement): void {
  input.enterKeyHint = NEW_LINE_HINT;
}
