import type { PickerReviewLine, PickerReviewView } from '../../../shared/types';
import { element } from '../../dom';

// The picker's review step: each question with the answer about to be sent, under its tab's header.
export function renderReviewLines(view: PickerReviewView): HTMLElement {
  const list: HTMLDivElement = element('div', 'question-review');
  list.append(...view.lines.map((line: PickerReviewLine, index: number) => reviewRow(line, view.tabs[index]?.header ?? '')));
  return list;
}

function reviewRow(line: PickerReviewLine, header: string): HTMLElement {
  const row: HTMLDivElement = element('div', 'question-answer-row');
  if (header.length > 0) row.append(element('span', 'question-chip', header));
  row.append(element('span', 'question-answer-question', line.question), element('span', 'question-answer-text', line.answer));
  return row;
}
