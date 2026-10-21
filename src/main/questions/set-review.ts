import type { PickerReviewLine, Question, QuestionAnswer } from '../../shared/types';
import { cleanOther } from './answer-plan';
import { labelMatches, squeeze } from './screen/picker-evidence';

// The review lists a multi-select's ticks in the order they were ticked, then the typed text.
export function expectedAnswerParts(question: Question, answer: QuestionAnswer): string[] {
  const labels: string[] = answer.selected.map((index: number) => question.options[index]?.label ?? '');
  const other: string | null = cleanOther(answer.other);
  return other === null ? labels : [...labels, other];
}

// Returns why the visible review lines disagree with the intended answers, or null. Lines cut off screen are
// not held against it; boxes ticked earlier in the terminal keep their place in the order, so parts are compared as a set.
export function reviewProblem(lines: readonly PickerReviewLine[], questions: readonly Question[], answers: readonly QuestionAnswer[]): string | null {
  for (const line of lines) {
    const index: number = questions.findIndex((question: Question) => labelMatches(line.question, question.question));
    const question: Question | undefined = questions[index];
    const answer: QuestionAnswer | undefined = answers[index];
    if (question === undefined || answer === undefined) return 'The review shows a question Orbit did not ask';
    if (!sameParts(line.answer, expectedAnswerParts(question, answer))) return `The review shows "${line.answer}" for "${question.header}"`;
  }
  return null;
}

function sameParts(shown: string, parts: readonly string[]): boolean {
  const visible: string = squeeze(shown);
  const expected: string[] = parts.map(squeeze);
  return visible.length === expected.join(',').length && expected.every((part: string) => visible.includes(part));
}
