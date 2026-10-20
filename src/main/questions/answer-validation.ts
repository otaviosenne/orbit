import type { QuestionAnswer } from '../../shared/types';
import { cleanOther } from './answer-plan';
import type { PickerShape } from './picker-keys';

// Options are picked by typing their number, and the picker takes one digit per option.
const MAX_DIGIT_OPTIONS: number = 9;

export type AnswerCheck = { readonly ok: true; readonly answer: QuestionAnswer } | { readonly ok: false; readonly error: string };

// The renderer's answer, checked against the question on screen before any key is sent.
export function checkAnswer(question: PickerShape, raw: unknown): AnswerCheck {
  const answer: QuestionAnswer | null = readAnswer(raw);
  if (answer === null) return invalid('Unreadable answer');
  const problem: string | null = answerProblem(question, answer);
  return problem === null ? { ok: true, answer } : invalid(problem);
}

function readAnswer(raw: unknown): QuestionAnswer | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { selected, other } = raw as { readonly selected?: unknown; readonly other?: unknown };
  if (!Array.isArray(selected) || !selected.every((index: unknown) => Number.isInteger(index))) return null;
  if (other !== null && typeof other !== 'string') return null;
  return { selected: [...new Set(selected as number[])], other: cleanOther(other) };
}

function answerProblem(question: PickerShape, answer: QuestionAnswer): string | null {
  if (question.options.length > MAX_DIGIT_OPTIONS) return 'Too many options to pick from here';
  if (answer.selected.some((index: number) => index < 0 || index >= question.options.length)) return 'Unknown option';
  const choices: number = answer.selected.length + (answer.other === null ? 0 : 1);
  if (choices === 0) return 'Pick an option';
  if (!question.multiSelect && choices > 1) return 'Pick only one option';
  return null;
}

function invalid(error: string): AnswerCheck {
  return { ok: false, error };
}
