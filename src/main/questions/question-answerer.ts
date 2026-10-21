import type { ActionResult, PickerQuestionView, QuestionPicker } from '../../shared/types';
import { delay } from '../run-command';
import { failure, success } from '../terminal-input';
import { tabSteps } from './answer-plan';
import type { AnswerCheck } from './answer-validation';
import { checkAnswer } from './answer-validation';
import { exclusively, recordedOutcome } from './picker-session';
import type { PickerStep } from './picker-keys';
import { submitReview } from './picker-keys';
import type { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { settledQuestionIds, waitForNewlySettled } from './question-lookup';
import { parsePicker } from './screen/picker-parser';

// How long the picker gets to redraw its next tab or the review after a tab was answered.
const PICKER_MOVE_TIMEOUT_MS: number = 3000;
const PICKER_MOVE_POLL_MS: number = 150;
const SCREEN_CHANGED: string = 'The question on screen changed; look at it again';

// Answers the tab on screen. A lone question is then sent; otherwise the picker moves to its next tab or the review.
export function answerQuestion(source: QuestionSource, sessionId: unknown, fingerprint: unknown, rawAnswer: unknown): Promise<ActionResult> {
  return exclusively(source, sessionId, async (terminal: PickerTerminal, session: string): Promise<ActionResult> => {
    const view: QuestionPicker | null = parsePicker(await terminal.screen());
    if (view?.kind !== 'question' || view.fingerprint !== fingerprint) return failure(SCREEN_CHANGED);
    const check: AnswerCheck = checkAnswer(view, rawAnswer);
    if (!check.ok) return failure(check.error);
    const steps: PickerStep[] = tabSteps(view, check.answer);
    if (!view.hasReview) return sendAndConfirm(source, session, terminal, steps);
    await terminal.run(steps);
    return (await pickerMoved(terminal, view)) ? success('socket') : failure('The picker did not move on; check the chat window');
  });
}

// Confirms the review step, after checking it still shows what the user reviewed in Orbit.
export function submitAnswers(source: QuestionSource, sessionId: unknown, fingerprint: unknown): Promise<ActionResult> {
  return exclusively(source, sessionId, async (terminal: PickerTerminal, session: string): Promise<ActionResult> => {
    const view: QuestionPicker | null = parsePicker(await terminal.screen());
    if (view?.kind !== 'review' || view.fingerprint !== fingerprint) return failure(SCREEN_CHANGED);
    return sendAndConfirm(source, session, terminal, [submitReview()]);
  });
}

// The last keys send the answers; done only once the chat wrote them into its transcript.
async function sendAndConfirm(source: QuestionSource, sessionId: string, terminal: PickerTerminal, steps: readonly PickerStep[]): Promise<ActionResult> {
  const known: Set<string> = await settledQuestionIds(source, sessionId);
  await terminal.run(steps);
  return recordedOutcome(await waitForNewlySettled(source, sessionId, known));
}

async function pickerMoved(terminal: PickerTerminal, before: PickerQuestionView): Promise<boolean> {
  const deadline: number = Date.now() + PICKER_MOVE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const now: QuestionPicker | null = parsePicker(await terminal.screen());
    if (now?.kind !== 'question' || now.fingerprint !== before.fingerprint) return true;
    await delay(PICKER_MOVE_POLL_MS);
  }
  return false;
}
