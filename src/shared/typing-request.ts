import { oneLine } from './ask';
import { isTypableText } from './remote-typing';

// A chat asking, through Orbit's request_typing tool, for the user to type one or more things (e-mail, password,
// confirm password) into the browser fields it focused on the PC, one after the other in Tab order. The user's text
// goes from Orbit straight to the keyboard: the chat never gets it.
export interface TypingField {
  // What to type, as the chat names it: "Modem admin password".
  readonly label: string;
}

export interface TypingRequest {
  // What the fields are for, as one short line ("Sign in to the modem"); null when the labels say it all.
  readonly title: string | null;
  readonly fields: readonly TypingField[];
  readonly requestedAt: number;
}

export const MAX_TYPING_LABEL_LENGTH: number = 120;
export const MAX_TYPING_TITLE_LENGTH: number = 120;
export const MIN_TYPING_FIELDS: number = 1;
// A sign-in or sign-up form rarely asks for more; past this the user is better off typing it themselves.
export const MAX_TYPING_FIELDS: number = 4;

// The user's texts, one per field in the request's order, or "decline"; the chat hears only which, never the text.
export interface TypingTexts {
  readonly texts: readonly string[];
  // Press Enter after the last text, so typing a password also signs in.
  readonly pressEnter: boolean;
}

export type TypingAnswer = TypingTexts | 'decline';

export function parseTypingRequest(raw: unknown): TypingRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  const requestedAt: unknown = candidate['requestedAt'];
  if (typeof requestedAt !== 'number' || !Number.isFinite(requestedAt)) return null;
  const title: string | null | undefined = parseTitle(candidate['title']);
  const fields: readonly TypingField[] | null = parseFields(candidate);
  if (title === undefined || fields === null) return null;
  return { title, fields, requestedAt };
}

// undefined marks a title that is there but not text, which makes the whole request unreadable.
function parseTitle(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const clean: string = oneLine(raw, MAX_TYPING_TITLE_LENGTH);
  return clean.length === 0 ? null : clean;
}

// A chat still running an older Orbit MCP server writes a single "label" instead of "fields".
function parseFields(candidate: Record<string, unknown>): readonly TypingField[] | null {
  const raw: unknown = candidate['fields'] ?? (typeof candidate['label'] === 'string' ? [{ label: candidate['label'] }] : undefined);
  if (!Array.isArray(raw) || raw.length < MIN_TYPING_FIELDS || raw.length > MAX_TYPING_FIELDS) return null;
  const fields: (TypingField | null)[] = raw.map(parseField);
  return fields.every((field: TypingField | null): field is TypingField => field !== null) ? fields : null;
}

function parseField(raw: unknown): TypingField | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const label: unknown = (raw as Record<string, unknown>)['label'];
  if (typeof label !== 'string') return null;
  const clean: string = oneLine(label, MAX_TYPING_LABEL_LENGTH);
  return clean.length === 0 ? null : { label: clean };
}

export function parseTypingAnswer(raw: unknown): TypingAnswer | null {
  return raw === 'decline' ? 'decline' : parseTypingTexts(raw);
}

function parseTypingTexts(raw: unknown): TypingTexts | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  const texts: unknown = candidate['texts'];
  const pressEnter: unknown = candidate['pressEnter'];
  if (!Array.isArray(texts) || texts.length < MIN_TYPING_FIELDS || texts.length > MAX_TYPING_FIELDS) return null;
  if (!texts.every(isTypableText) || typeof pressEnter !== 'boolean') return null;
  return { texts: [...texts], pressEnter };
}

// The answer must fill exactly the request it claims: one text per field, so nothing lands in a field the chat did
// not ask for.
export function answerFits(request: TypingRequest, answer: TypingAnswer): boolean {
  return answer === 'decline' || answer.texts.length === request.fields.length;
}
