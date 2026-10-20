import type { ActionResult, PickerQuestionView, PickerReviewView, PickerTab, QuestionAnswer, QuestionPicker } from '../../../shared/types';
import { element } from '../../dom';
import { QuestionFieldset } from './question-fieldset';
import { renderReviewLines } from './picker-review';

// What the card can do in the chat's terminal; each resolves once the picker moved on, or with why not.
export interface PickerActions {
  answer(fingerprint: string, answer: QuestionAnswer): Promise<ActionResult>;
  submit(fingerprint: string): Promise<ActionResult>;
  // Called after a successful step so the next tab (or the answered summary) shows without waiting for a poll.
  moved(): void;
}

const TITLE: string = 'Claude is asking';
const TERMINAL_HINT: string = 'Answer it in the chat\'s terminal (Go to chat)';
const UNREADABLE_HINT: string = 'Orbit cannot read this question. Answer it in the chat\'s terminal (Go to chat)';
const SENDING_LABEL: string = 'Sending…';

// The question picker on the chat's terminal, as a card at the end of the thread; read-only without actions.
export class PickerCard {
  readonly root: HTMLElement = element('section', 'question-card is-pending');
  private readonly button: HTMLButtonElement = element('button', 'button button-primary question-submit');
  private readonly problem: HTMLSpanElement = element('span', 'question-problem');
  private fieldset: QuestionFieldset | null = null;
  private isSending: boolean = false;

  constructor(view: QuestionPicker, private readonly actions: PickerActions | null) {
    if (view.kind === 'unreadable') {
      this.root.append(cardHead(TITLE, null), element('span', 'question-hint', UNREADABLE_HINT));
      return;
    }
    this.root.append(cardHead(TITLE, view.kind === 'question' ? stepLabel(view) : 'Review your answers'), ...this.body(view), this.foot(view));
    this.refresh();
  }

  private body(view: PickerQuestionView | PickerReviewView): HTMLElement[] {
    if (view.kind === 'review') return [renderReviewLines(view)];
    const header: string | null = view.current === null ? null : (view.tabs[view.current]?.header ?? null);
    this.fieldset = new QuestionFieldset({ ...view, header }, `picker-${view.fingerprint}`, (): void => this.refresh());
    return [this.fieldset.root];
  }

  private foot(view: PickerQuestionView | PickerReviewView): HTMLElement {
    const foot: HTMLElement = element('footer', 'question-foot');
    if (this.actions === null) {
      this.fieldset?.setDisabled(true);
      foot.append(element('span', 'question-hint', TERMINAL_HINT));
      return foot;
    }
    this.button.type = 'button';
    this.button.textContent = buttonLabel(view);
    this.button.addEventListener('click', (): void => void this.send(view));
    foot.append(this.problem, this.button);
    return foot;
  }

  private refresh(): void {
    this.button.disabled = this.isSending || (this.fieldset !== null && this.fieldset.read() === null);
  }

  private async send(view: PickerQuestionView | PickerReviewView): Promise<void> {
    const actions: PickerActions | null = this.actions;
    const answer: QuestionAnswer | null = this.fieldset?.read() ?? null;
    if (actions === null || this.isSending || (view.kind === 'question' && answer === null)) return;
    const label: string = this.button.textContent ?? '';
    this.setSending(true, SENDING_LABEL);
    const result: ActionResult = await settle(view.kind === 'review' || answer === null ? actions.submit(view.fingerprint) : actions.answer(view.fingerprint, answer));
    this.problem.textContent = result.ok ? '' : (result.error ?? 'Could not send the answer');
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
  head.append(element('span', 'question-title', title));
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

async function settle(result: Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await result;
  } catch (error: unknown) {
    return { ok: false, method: null, error: error instanceof Error ? error.message : String(error) };
  }
}
