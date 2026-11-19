import { isTypableText } from './remote-typing';
import type { TypingRequest } from './typing-request';
import { isFieldIndex } from './typing-request';

// One field the user copies to the PC's clipboard, by its index in the request, with the text to copy.
export interface FieldCopy {
  readonly field: number;
  readonly text: string;
}

// The chat hears only which field was copied, or that the user declined, never the text.
export type TypingAnswer = FieldCopy | 'decline';

export function parseTypingAnswer(raw: unknown): TypingAnswer | null {
  return raw === 'decline' ? 'decline' : parseFieldCopy(raw);
}

function parseFieldCopy(raw: unknown): FieldCopy | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  const field: unknown = candidate['field'];
  const text: unknown = candidate['text'];
  if (typeof field !== 'number' || !Number.isInteger(field) || !isTypableText(text)) return null;
  return { field, text };
}

// A copy must name a field the claimed request has and has not copied yet, so a stale bar never re-copies or
// overshoots.
export function answerFits(request: TypingRequest, answer: TypingAnswer): boolean {
  if (answer === 'decline') return true;
  return isFieldIndex(answer.field, request.fields.length) && !request.copied.includes(answer.field);
}
