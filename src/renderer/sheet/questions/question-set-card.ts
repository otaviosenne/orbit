import type { ActionResult, PickerChoice, PickerSetView, Question, QuestionAnswer, QuestionOption } from '../../../shared/types';
import { element } from '../../dom';
import type { FieldsetQuestion } from './question-fieldset';
import { QuestionFieldset } from './question-fieldset';
import { ProblemLine } from './problem-line';
import { QuestionProgress, renderDismissButton, renderQuestionTitle } from './question-head';
import { settleAction } from './settle-action';

// What a question-set card needs: send every answer at once, hear that the picker is done, reach the chat.
export interface QuestionSetActions {
  answerSet(questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult>;
  decline(): Promise<ActionResult>;
  moved(): void;
  goToChat(): void;
}

const TITLE: string = 'Claude is asking';
const SUBMIT_LABEL: string = 'Submit';
const NEXT_LABEL: string = 'Next';
const BACK_LABEL: string = 'Back';
const SENDING_LABEL: string = 'Sending…';
const PREVIOUS_ARROW: string = '‹';
const NEXT_ARROW: string = '›';

// Every question of a waiting AskUserQuestion, one step at a time. Each step keeps its own fieldset, so going
// back and forth keeps what was picked; only the last step sends, all answers together.
export class QuestionSetCard {
  readonly root: HTMLElement = element('section', 'question-card is-pending is-stepped');
  private readonly fieldsets: QuestionFieldset[];
  private readonly stepLabel: HTMLSpanElement = element('span', 'question-count');
  private readonly previousArrow: HTMLButtonElement = arrowButton(PREVIOUS_ARROW, 'Previous question');
  private readonly nextArrow: HTMLButtonElement = arrowButton(NEXT_ARROW, 'Next question');
  private readonly back: HTMLButtonElement = element('button', 'button question-back', BACK_LABEL);
  private readonly forward: HTMLButtonElement = element('button', 'button button-primary question-submit');
  private readonly problem: ProblemLine;
  private readonly progress: QuestionProgress;
  private step: number = 0;
  private isSending: boolean = false;

  constructor(private readonly view: PickerSetView, private readonly actions: QuestionSetActions) {
    this.problem = new ProblemLine((): void => actions.goToChat());
    this.progress = new QuestionProgress(view.questions.length, (index: number): void => this.go(index));
    this.fieldsets = view.questions.map((question: Question, index: number) => new QuestionFieldset(fieldsetQuestion(question), `set-${view.questionId}-${index}`, (): void => this.refresh()));
    this.previousArrow.addEventListener('click', (): void => this.go(this.step - 1));
    this.nextArrow.addEventListener('click', (): void => this.go(this.step + 1));
    this.back.type = 'button';
    this.back.addEventListener('click', (): void => this.go(this.step - 1));
    this.forward.type = 'button';
    this.forward.addEventListener('click', (): void => void (this.isLastStep ? this.send() : this.go(this.step + 1)));
    this.root.append(this.head(), ...(this.fieldsets.length > 1 ? [this.progress.root] : []), ...this.fieldsets.map((fieldset: QuestionFieldset) => fieldset.root), this.foot());
    this.go(0);
  }

  private get isLastStep(): boolean {
    return this.step === this.fieldsets.length - 1;
  }

  private head(): HTMLElement {
    const head: HTMLElement = element('header', 'question-head');
    head.append(...renderQuestionTitle(TITLE));
    if (this.fieldsets.length > 1) {
      const stepper: HTMLSpanElement = element('span', 'question-stepper');
      stepper.append(this.previousArrow, this.stepLabel, this.nextArrow);
      head.append(stepper);
    }
    head.append(renderDismissButton((): void => void this.decline()));
    return head;
  }

  private foot(): HTMLElement {
    const foot: HTMLElement = element('footer', 'question-foot');
    foot.append(this.problem.root, this.back, this.forward);
    return foot;
  }

  private go(step: number): void {
    if (step < 0 || step >= this.fieldsets.length || this.isSending) return;
    this.step = step;
    this.fieldsets.forEach((fieldset: QuestionFieldset, index: number) => {
      fieldset.root.hidden = index !== step;
    });
    this.stepLabel.textContent = `Question ${step + 1} of ${this.fieldsets.length}`;
    this.progress.show(step, this.fieldsets.map((fieldset: QuestionFieldset): boolean => fieldset.read() !== null));
    this.refresh();
  }

  // Moving between steps is always allowed; Next waits for this step's answer, Submit for every answer.
  private refresh(): void {
    const answered: boolean = this.fieldsets[this.step]?.read() !== null;
    this.progress.show(this.step, this.fieldsets.map((fieldset: QuestionFieldset): boolean => fieldset.read() !== null));
    this.progress.setDisabled(this.isSending);
    this.previousArrow.disabled = this.isSending || this.step === 0;
    this.nextArrow.disabled = this.isSending || this.isLastStep;
    this.back.hidden = this.step === 0;
    this.back.disabled = this.isSending;
    if (!this.isSending) this.forward.textContent = this.isLastStep ? SUBMIT_LABEL : NEXT_LABEL;
    this.forward.disabled = this.isSending || (this.isLastStep ? this.answers() === null : !answered);
  }

  private answers(): QuestionAnswer[] | null {
    const answers: (QuestionAnswer | null)[] = this.fieldsets.map((fieldset: QuestionFieldset) => fieldset.read());
    return answers.every((answer: QuestionAnswer | null): answer is QuestionAnswer => answer !== null) ? answers : null;
  }

  private async send(): Promise<void> {
    const answers: QuestionAnswer[] | null = this.answers();
    if (answers === null || this.isSending) return;
    this.problem.clear();
    this.setSending(true);
    const result: ActionResult = await settleAction(this.actions.answerSet(this.view.questionId, answers));
    // On success the card stays locked: the chat recorded the answers, and the next read replaces this card.
    if (result.ok) return this.actions.moved();
    // Their choices stay as they are, so trying again is one click.
    this.problem.show(result.error ?? 'Could not send the answers');
    this.setSending(false);
  }

  private async decline(): Promise<void> {
    if (this.isSending) return;
    this.problem.clear();
    this.setSending(true);
    const result: ActionResult = await settleAction(this.actions.decline());
    if (result.ok) return this.actions.moved();
    this.problem.show(result.error ?? 'Could not dismiss the question');
    this.setSending(false);
  }

  private setSending(sending: boolean): void {
    this.isSending = sending;
    this.root.classList.toggle('is-sending', sending);
    this.fieldsets.forEach((fieldset: QuestionFieldset) => fieldset.setDisabled(sending));
    if (sending) this.forward.textContent = SENDING_LABEL;
    this.refresh();
  }
}

function fieldsetQuestion(question: Question): FieldsetQuestion {
  const options: PickerChoice[] = question.options.map((option: QuestionOption): PickerChoice => ({ ...option, ticked: false }));
  // The preview layout has no "Type something" field to put an answer of one's own in.
  return { question: question.question, header: question.header, multiSelect: question.multiSelect, options, other: null, allowsOther: !question.hasPreviews };
}

function arrowButton(label: string, name: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'question-arrow', label);
  button.type = 'button';
  button.setAttribute('aria-label', name);
  return button;
}
