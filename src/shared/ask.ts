// A chat asking the user's permission through Orbit's ask_user tool (choices between options go through
// AskUserQuestion, in the thread). Orbit pins it above the chat until it is answered, so it is never lost in a long reply.
export interface AskOption {
  readonly label: string;
  // One short line under the label; empty when the label says it all.
  readonly description: string;
}

export interface AskRequest {
  readonly question: string;
  readonly options: readonly AskOption[];
  readonly requestedAt: number;
}

// A choice needs two options; past four the bar stops fitting above the thread, as with AskUserQuestion.
export const MIN_ASK_OPTIONS: number = 2;
export const MAX_ASK_OPTIONS: number = 4;
// One or two sentences, so the bar never grows into a page.
export const MAX_QUESTION_LENGTH: number = 400;
export const MAX_LABEL_LENGTH: number = 80;
export const MAX_DESCRIPTION_LENGTH: number = 160;

// The answer is typed into the chat's terminal, where a newline would send it early.
export function oneLine(text: string, maxLength: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

// Written by another program, so every field is checked before it reaches the screen or the chat.
export function parseAsk(raw: unknown): AskRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { question, options, requestedAt } = raw as Record<string, unknown>;
  if (typeof question !== 'string' || typeof requestedAt !== 'number' || !Array.isArray(options)) return null;
  const text: string = oneLine(question, MAX_QUESTION_LENGTH);
  const parsed: AskOption[] = options.map(parseOption).filter((option: AskOption | null): option is AskOption => option !== null);
  if (text.length === 0 || parsed.length !== options.length || parsed.length < MIN_ASK_OPTIONS || parsed.length > MAX_ASK_OPTIONS) return null;
  return { question: text, options: parsed, requestedAt };
}

function parseOption(raw: unknown): AskOption | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { label, description } = raw as Record<string, unknown>;
  if (typeof label !== 'string' || (description !== undefined && typeof description !== 'string')) return null;
  const text: string = oneLine(label, MAX_LABEL_LENGTH);
  return text.length === 0 ? null : { label: text, description: oneLine(description ?? '', MAX_DESCRIPTION_LENGTH) };
}

// What the bar can do with an ask: pick an option (its index), or set it aside to answer in the chat.
export type AskAnswer = number | 'chat';

export function isAskAnswer(value: unknown): value is AskAnswer {
  return value === 'chat' || (Number.isInteger(value) && (value as number) >= 0);
}

// What Orbit types into the chat; it repeats the question so the chat knows which ask it settles.
export function askReply(request: AskRequest, choice: number): string {
  const option: AskOption | undefined = request.options[choice];
  return option === undefined ? '' : `Answered in Orbit: ${option.label} (Question: ${request.question})`;
}

export function isAskChoice(request: AskRequest, choice: unknown): choice is number {
  return Number.isInteger(choice) && (choice as number) >= 0 && (choice as number) < request.options.length;
}
