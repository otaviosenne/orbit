// A secret the user hands to a chat through Orbit's request_typing bar (a password, say): Orbit puts it on the PC's
// clipboard and the chat pastes it. Only the user's own button sends it; the text is never stored, logged or shown
// to a chat.

// Long enough for any password or passphrase; a stray paste of a whole document is refused.
export const MAX_TYPED_LENGTH: number = 512;

// One value Orbit is willing to copy: something there, not overlong, and on one line, since a line break would
// submit the form early when pasted and a password never has one.
export function isTypableText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TYPED_LENGTH && !/[\r\n]/.test(value);
}
