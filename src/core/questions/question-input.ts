import type { Question, QuestionOption } from '../../shared/types';

export const ASK_USER_QUESTION_TOOL: string = 'AskUserQuestion';

type UnknownRecord = Readonly<Record<string, unknown>>;

// Reads AskUserQuestion's input; null when it is not the shape Claude Code shows as a picker.
export function parseQuestions(input: UnknownRecord): Question[] | null {
  const raw: unknown = input['questions'];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const questions: (Question | null)[] = raw.map(parseQuestion);
  return questions.every((question: Question | null): question is Question => question !== null) ? questions : null;
}

function parseQuestion(raw: unknown): Question | null {
  if (!isRecord(raw) || typeof raw['question'] !== 'string' || !Array.isArray(raw['options'])) return null;
  const rawOptions: UnknownRecord[] = raw['options'].filter(isRecord);
  const options: QuestionOption[] = rawOptions.map(parseOption);
  if (options.length === 0) return null;
  return {
    question: raw['question'],
    header: stringOr(raw['header'], ''),
    options,
    multiSelect: raw['multiSelect'] === true,
    hasPreviews: rawOptions.some((option: UnknownRecord) => stringOr(option['preview'], '').length > 0),
  };
}

function parseOption(raw: UnknownRecord): QuestionOption {
  return { label: stringOr(raw['label'], ''), description: stringOr(raw['description'], '') };
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
