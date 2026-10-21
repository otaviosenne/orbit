import type { Question } from '../../shared/types';

// A lone single-choice question has no review: picking the option sends the answer.
export function pickerHasReview(questions: readonly Question[]): boolean {
  return questions.length > 1 || questions.some((question: Question) => question.multiSelect);
}
