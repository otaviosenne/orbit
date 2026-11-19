import { oneLine } from './ask';

// A chat asking, through Orbit's request_typing tool, for the user to hand over one or more things it must never see
// (e-mail, password, confirm password). The user copies each field to the PC's clipboard from Orbit and the chat
// pastes it with ctrl+v: the chat never gets the text.
export interface TypingField {
  // What goes in the field, as the chat names it: "Modem admin password".
  readonly label: string;
}

export interface TypingRequest {
  // What the fields are for, as one short line ("Sign in to the modem"); null when the labels say it all.
  readonly title: string | null;
  readonly fields: readonly TypingField[];
  readonly requestedAt: number;
  // Indexes of the fields already copied, so the bar shows them done and the request stays open for the rest.
  readonly copied: readonly number[];
  // When the last field was copied. The chat then pastes and ends its turn again; that work is not the user
  // answering some other way, so it must not close the request for the fields still to copy.
  readonly copiedAt: number | null;
}

export const MAX_TYPING_LABEL_LENGTH: number = 120;
export const MAX_TYPING_TITLE_LENGTH: number = 120;
export const MIN_TYPING_FIELDS: number = 1;
// A sign-in or sign-up form rarely asks for more; past this the user is better off typing it themselves.
export const MAX_TYPING_FIELDS: number = 4;

export function parseTypingRequest(raw: unknown): TypingRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  const requestedAt: unknown = candidate['requestedAt'];
  if (typeof requestedAt !== 'number' || !Number.isFinite(requestedAt)) return null;
  const title: string | null | undefined = parseTitle(candidate['title']);
  const fields: readonly TypingField[] | null = parseFields(candidate);
  if (title === undefined || fields === null) return null;
  const copied: readonly number[] = parseCopied(candidate['copied'], fields.length);
  return { title, fields, requestedAt, copied, copiedAt: parseCopiedAt(candidate['copiedAt']) };
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

// A file written before any copy, or by an older Orbit, has no copies yet.
function parseCopied(raw: unknown, fieldCount: number): readonly number[] {
  if (!Array.isArray(raw)) return [];
  const indexes: number[] = raw.filter((index: unknown): index is number => isFieldIndex(index, fieldCount));
  return [...new Set(indexes)];
}

function parseCopiedAt(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function isFieldIndex(index: unknown, fieldCount: number): index is number {
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < fieldCount;
}

// The request's last sign of life: a copy restarts the wait, since the chat ends its turn again after pasting.
export function openSince(request: TypingRequest): number {
  return request.copiedAt ?? request.requestedAt;
}

export function withCopied(request: TypingRequest, field: number, now: number): TypingRequest {
  return { ...request, copied: [...new Set([...request.copied, field])], copiedAt: now };
}

export function isFullyCopied(request: TypingRequest): boolean {
  return request.fields.every((_field: TypingField, index: number): boolean => request.copied.includes(index));
}

export function remainingFields(request: TypingRequest): readonly TypingField[] {
  return request.fields.filter((_field: TypingField, index: number): boolean => !request.copied.includes(index));
}
