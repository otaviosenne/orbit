import type { QuestionAnswer } from '../../shared/types';
import { cleanOther } from './answer-plan';
import type { PickerShape } from './picker-keys';
import { offersOther } from './picker-keys';

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
  if (answer.other !== null && !offersOther(question)) return 'This question has no "Other" field';
  const choices: number = answer.selected.length + (answer.other === null ? 0 : 1);
  if (choices === 0) return 'Pick an option';
  if (!question.multiSelect && choices > 1) return 'Pick only one option';
  return null;
}

function invalid(error: string): AnswerCheck {
  return { ok: false, error };
}

export type AnswerSetCheck = { readonly ok: true; readonly answers: QuestionAnswer[] } | { readonly ok: false; readonly error: string };

// One answer per question, each checked against its own question.
export function checkAnswerSet(questions: readonly (PickerShape & { readonly header: string })[], raw: unknown): AnswerSetCheck {
  if (!Array.isArray(raw) || raw.length !== questions.length) return { ok: false, error: 'Answer every question' };
  const answers: QuestionAnswer[] = [];
  for (const [index, question] of questions.entries()) {
    const check: AnswerCheck = checkAnswer(question, raw[index]);
    if (!check.ok) return { ok: false, error: `${question.header || `Question ${index + 1}`}: ${check.error}` };
    answers.push(check.answer);
  }
  return { ok: true, answers };
}
