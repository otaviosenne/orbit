// "Type on the PC": the user writes text (a password, say) in Orbit and has the desktop type it into the window that
// has focus. Only the user's own button sends it; the text is never stored, logged or shown to a chat.

// Long enough for any password or passphrase; a stray paste of a whole document is refused.
export const MAX_TYPED_LENGTH: number = 512;

export interface TypingTarget {
  // The focused window's title and app, so the user sees where the text will land before sending it.
  readonly title: string;
  readonly app: string;
  // False for a window Orbit never types into, with why.
  readonly accepts: boolean;
  readonly refusal: string | null;
}

// One value Orbit is willing to type: something to type, not overlong, and on one line, since a line break would
// submit the form early and a password never has one.
export function isTypableText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TYPED_LENGTH && !/[\r\n]/.test(value);
}
