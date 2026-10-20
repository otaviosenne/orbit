import type { Question } from '../../shared/types';
import { isRecord } from './question-input';

// Claude Code keeps the answers keyed by the question's text: { answers: { "<question>": "<answer>" } }.
// Older or resumed records carry no structured copy, so every answer is null there.
export function recordedAnswers(toolUseResult: unknown, questions: readonly Question[]): (string | null)[] {
  const answers: unknown = isRecord(toolUseResult) ? toolUseResult['answers'] : undefined;
  return questions.map((question: Question): string | null => {
    const answer: unknown = isRecord(answers) ? answers[question.question] : undefined;
    return typeof answer === 'string' ? answer : null;
  });
}
