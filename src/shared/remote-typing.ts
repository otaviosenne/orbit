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

export interface TypeRequest {
  readonly text: string;
  // Press Enter after the text, so typing a password also signs in.
  readonly pressEnter: boolean;
}

export function parseTypeRequest(value: unknown): TypeRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  const text: unknown = candidate['text'];
  const pressEnter: unknown = candidate['pressEnter'];
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_TYPED_LENGTH || typeof pressEnter !== 'boolean') return null;
  // A line break would submit the form early; a password never has one.
  if (/[\r\n]/.test(text)) return null;
  return { text, pressEnter };
}
