import type { ActionResult, Question, QuestionAnswer, QuestionItem } from '../../shared/types';
import { failure } from '../terminal-input';
import type { AnswerSetCheck } from './answer-validation';
import { checkAnswerSet } from './answer-validation';
import { submitReview } from './picker-keys';
import { exclusively, recordedOutcome } from './picker-session';
import type { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { isInTranscript, pendingQuestion, settledQuestionIds, waitForNewlySettled } from './question-lookup';
import { stripAnsi } from './screen/ansi-line';
import { contradictsSet, showsPicker, showsReviewSubmit, squeeze, visibleReviewLines } from './screen/picker-evidence';
import { parsePicker } from './screen/picker-parser';
import { SetDriver } from './set-driver';
import { pickerHasReview } from './set-keys';
import { reviewProblem } from './set-review';

// Answers every question of a waiting AskUserQuestion from its transcript copy, then submits the picker.
export function answerQuestionSet(source: QuestionSource, sessionId: unknown, questionId: unknown, rawAnswers: unknown): Promise<ActionResult> {
  return exclusively(source, sessionId, async (terminal: PickerTerminal, session: string): Promise<ActionResult> => {
    const item: QuestionItem | null = await pendingQuestion(source, session);
    if (item === null || item.id !== questionId) return failure('This question is no longer waiting for an answer');
    const check: AnswerSetCheck = checkAnswerSet(item.questions, rawAnswers);
    if (!check.ok) return failure(check.error);
    const problem: string | null = await screenProblem(terminal, item.questions);
    if (problem !== null) return failure(problem);
    const known: Set<string> = await settledQuestionIds(source, session);
    const isHooked: boolean = !(await isInTranscript(source, session, item.id));
    const driven: string | null = await drive(terminal, item.questions, check.answers);
    if (driven !== null) return failure(driven);
    return recordedOutcome(await waitForNewlySettled(source, session, known, (settled: QuestionItem) => sameQuestions(settled, item), isHooked));
  });
}

// Keys are only sent where a picker is positively on screen and nothing visible says it asks something else.
export async function screenProblem(terminal: PickerTerminal, questions: readonly Question[]): Promise<string | null> {
  const screen: string = await terminal.screen();
  if (!showsPicker(stripAnsi(screen))) return 'The question is not showing in the chat\'s terminal';
  return contradictsSet(parsePicker(screen), questions) ? 'The terminal shows a different question; answer it in the chat window' : null;
}

async function drive(terminal: PickerTerminal, questions: readonly Question[], answers: readonly QuestionAnswer[]): Promise<string | null> {
  const problem: string | null = await new SetDriver(terminal).answer(questions, answers);
  if (problem !== null || !pickerHasReview(questions)) return problem;
  // Left unconfirmed on a mismatch, so the user can fix it in the terminal instead of sending the wrong answer.
  const screen: string = await terminal.plainScreen();
  if (!showsReviewSubmit(screen)) return 'The picker did not reach its review step; check the chat window';
  const mismatch: string | null = reviewProblem(visibleReviewLines(screen), questions, answers);
  if (mismatch !== null) return `${mismatch}; finish this question in the chat window`;
  await terminal.run([submitReview()]);
  return null;
}

function sameQuestions(settled: QuestionItem, asked: QuestionItem): boolean {
  const texts = (item: QuestionItem): string => item.questions.map((question: Question) => squeeze(question.question)).join('\n');
  return texts(settled) === texts(asked);
}
