import type { PickerChoice, Question, QuestionItem, QuestionOption } from '../../../shared/types';
import { element } from '../../dom';
import { QuestionFieldset } from './question-fieldset';

const TITLE: string = 'Claude is asking';
const TERMINAL_HINT: string = 'Answer it in the chat\'s terminal (Go to chat)';

// A waiting question known from the transcript while its picker cannot be read off the terminal:
// every question and option, read-only.
export function renderPendingQuestion(item: QuestionItem): HTMLElement {
  const card: HTMLElement = element('section', 'question-card is-pending');
  const head: HTMLElement = element('header', 'question-head');
  head.append(element('span', 'question-title', TITLE));
  if (item.questions.length > 1) head.append(element('span', 'question-count', `${item.questions.length} questions`));
  const foot: HTMLElement = element('footer', 'question-foot');
  foot.append(element('span', 'question-hint', TERMINAL_HINT));
  card.append(head, ...item.questions.map((question: Question, index: number) => readOnlyFieldset(question, `pending-${item.id}-${index}`)), foot);
  return card;
}

function readOnlyFieldset(question: Question, name: string): HTMLElement {
  const options: PickerChoice[] = question.options.map((option: QuestionOption): PickerChoice => ({ ...option, ticked: false }));
  const fieldset: QuestionFieldset = new QuestionFieldset({ ...question, options, other: null }, name, (): void => undefined);
  fieldset.setDisabled(true);
  return fieldset.root;
}
