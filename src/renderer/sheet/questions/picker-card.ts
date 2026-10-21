import type { ActionResult, PickerQuestionView, PickerReviewView, PickerTab, PickerUnreadableView, QuestionAnswer } from '../../../shared/types';
import { element } from '../../dom';
import { QuestionFieldset } from './question-fieldset';
import { renderReviewLines } from './picker-review';
import { ProblemLine } from './problem-line';
import { settleAction } from './settle-action';
import { renderQuestionTitle } from './question-head';

// What the card can do in the chat's terminal; each resolves once the picker moved on, or with why not.
export interface PickerActions {
  answer(fingerprint: string, answer: QuestionAnswer): Promise<ActionResult>;
  submit(fingerprint: string): Promise<ActionResult>;
  answerSet(questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult>;
  // Called after a successful step so the next tab (or the answered summary) shows without waiting for a poll.
  moved(): void;
  // Brings up the chat's own window, for an answer that could not go through from here.
  goToChat(): void;
}

const TITLE: string = 'Claude is asking';
// Nothing on screen or in the transcript says what the question is, so the chat's own window is the way to it.
const UNREADABLE_HINT: string = 'Claude is waiting on a question this window cannot show.';
const SENDING_LABEL: string = 'Sending…';

// The question picker read off the chat's terminal, as a card at the end of the thread.
export class PickerCard {
  readonly root: HTMLElement = element('section', 'question-card is-pending');
  private readonly button: HTMLButtonElement = element('button', 'button button-primary question-submit');
  private readonly problem: ProblemLine;
  private fieldset: QuestionFieldset | null = null;
  private isSending: boolean = false;

  constructor(view: PickerQuestionView | PickerReviewView | PickerUnreadableView, private readonly actions: PickerActions) {
    this.problem = new ProblemLine((): void => actions.goToChat());
    if (view.kind === 'unreadable') {
      this.problem.showNote(UNREADABLE_HINT);
      this.root.append(cardHead(TITLE, null), this.problem.root);
      return;
    }
    this.root.append(cardHead(TITLE, view.kind === 'question' ? stepLabel(view) : 'Review your answers'), ...this.body(view), this.foot(view));
    this.refresh();
  }

  private body(view: PickerQuestionView | PickerReviewView): HTMLElement[] {
    if (view.kind === 'review') return [renderReviewLines(view)];
    const header: string | null = view.current === null ? null : (view.tabs[view.current]?.header ?? null);
    this.fieldset = new QuestionFieldset({ ...view, header, allowsOther: true }, `picker-${view.fingerprint}`, (): void => this.refresh());
    return [this.fieldset.root];
  }

  private foot(view: PickerQuestionView | PickerReviewView): HTMLElement {
    const foot: HTMLElement = element('footer', 'question-foot');
    this.button.type = 'button';
    this.button.textContent = buttonLabel(view);
    this.button.addEventListener('click', (): void => void this.send(view));
    foot.append(this.problem.root, this.button);
    return foot;
  }

  private refresh(): void {
    this.button.disabled = this.isSending || (this.fieldset !== null && this.fieldset.read() === null);
  }

  private async send(view: PickerQuestionView | PickerReviewView): Promise<void> {
    const actions: PickerActions = this.actions;
    const answer: QuestionAnswer | null = this.fieldset?.read() ?? null;
    if (this.isSending || (view.kind === 'question' && answer === null)) return;
    const label: string = this.button.textContent ?? '';
    this.setSending(true, SENDING_LABEL);
    const result: ActionResult = await settleAction(view.kind === 'review' || answer === null ? actions.submit(view.fingerprint) : actions.answer(view.fingerprint, answer));
    if (result.ok) this.problem.clear();
    else this.problem.show(result.error ?? 'Could not send the answer');
    // On success the card stays locked: the picker moved on, and the next read replaces this card.
    if (result.ok) return actions.moved();
    this.setSending(false, label);
  }

  private setSending(sending: boolean, label: string): void {
    this.isSending = sending;
    this.root.classList.toggle('is-sending', sending);
    this.fieldset?.setDisabled(sending);
    this.button.textContent = label;
    this.refresh();
  }
}

function cardHead(title: string, step: string | null): HTMLElement {
  const head: HTMLElement = element('header', 'question-head');
  head.append(...renderQuestionTitle(title));
  if (step !== null) head.append(element('span', 'question-count', step));
  return head;
}

// "Question 2 of 3" when the picker has tabs and shows which one is current.
function stepLabel(view: PickerQuestionView): string | null {
  if (view.tabs.length < 2) return null;
  const answered: number = view.tabs.filter((tab: PickerTab) => tab.answered).length;
  return view.current === null ? `${answered} of ${view.tabs.length} answered` : `Question ${view.current + 1} of ${view.tabs.length}`;
}

// The picker sends a lone single-choice answer at once; with a review, each tab only moves on.
function buttonLabel(view: PickerQuestionView | PickerReviewView): string {
  if (view.kind === 'review') return 'Submit answers';
  return view.hasReview ? 'Next' : 'Submit';
}
