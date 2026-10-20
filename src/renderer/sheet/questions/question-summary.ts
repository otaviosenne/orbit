import type { Question, QuestionItem, QuestionState } from '../../../shared/types';
import { element } from '../../dom';
import { renderMarkdown } from '../../markdown';
import type { OpenState } from '../transcript/disclosure';
import { disclosure } from '../transcript/disclosure';

// 'pending' only shows for the moment between the answer being sent and the chat recording it.
const TITLES: Readonly<Record<QuestionState, string>> = { pending: 'Asked', answered: 'Answered', declined: 'Declined', expired: 'Not answered' };
const ANSWER_SEPARATOR: string = ' · ';

// A question from the transcript: one line saying what was answered, opening to each question and its answer.
export function renderQuestionSummary(item: QuestionItem, isOpen: OpenState): HTMLElement {
  const state: QuestionState = item.state;
  const answered: string[] = item.answers.filter((answer: string | null): answer is string => answer !== null);
  const summary: Node[] = [element('span', 'question-summary-title', `${TITLES[state]}${answered.length > 0 ? ':' : ''}`)];
  if (answered.length > 0) summary.push(element('span', 'question-summary-answers', answered.join(ANSWER_SEPARATOR)));
  const body: Node[] = item.questions.map((question: Question, index: number) => answerRow(question, item.answers[index] ?? null));
  // Older records and declines keep only what the chat was told.
  if (answered.length === 0 && item.note !== null) body.push(noteBlock(item.note));
  return disclosure(`question:${item.id}`, `question-summary is-${state}`, summary, body, isOpen);
}

function answerRow(question: Question, answer: string | null): HTMLElement {
  const row: HTMLDivElement = element('div', 'question-answer-row');
  if (question.header.length > 0) row.append(element('span', 'question-chip', question.header));
  row.append(element('span', 'question-answer-question', question.question));
  if (answer !== null) row.append(element('span', 'question-answer-text', answer));
  return row;
}

function noteBlock(note: string): HTMLElement {
  const block: HTMLDivElement = element('div', 'markdown question-note');
  renderMarkdown(block, note);
  return block;
}
