import { oneLine } from './ask';
import type { TypeRequest } from './remote-typing';
import { parseTypeRequest } from './remote-typing';

// A chat asking, through Orbit's request_typing tool, for the user to type something (a password) into the browser
// field it focused on the PC. The user's text goes from Orbit straight to the keyboard: the chat never gets it.
export interface TypingRequest {
  // What to type, as the chat names it: "Modem admin password".
  readonly label: string;
  readonly requestedAt: number;
}

export const MAX_TYPING_LABEL_LENGTH: number = 120;

// The user's text to type, or "decline"; the chat hears only which, never the text.
export type TypingAnswer = TypeRequest | 'decline';

export function parseTypingRequest(raw: unknown): TypingRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  const label: unknown = candidate['label'];
  const requestedAt: unknown = candidate['requestedAt'];
  if (typeof label !== 'string' || typeof requestedAt !== 'number' || !Number.isFinite(requestedAt)) return null;
  const clean: string = oneLine(label, MAX_TYPING_LABEL_LENGTH);
  return clean.length === 0 ? null : { label: clean, requestedAt };
}

export function parseTypingAnswer(raw: unknown): TypingAnswer | null {
  return raw === 'decline' ? 'decline' : parseTypeRequest(raw);
}

// Typed into the chat's terminal as the user's next message: what happened, never what was typed.
export function typingReply(request: TypingRequest, answer: TypingAnswer): string {
  if (answer === 'decline') return `Declined in Orbit: the user did not type ${request.label}.`;
  return `Typed in Orbit: the user typed ${request.label} into the focused field${answer.pressEnter ? ' and pressed Enter' : ''}. You never get the text.`;
}
