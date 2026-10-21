import type { SplitItem } from './review-line';
import { splitInlineAnswer, withoutBorder } from './review-line';
import type { PickerReviewLine, Question, QuestionPicker } from '../../../shared/types';

const WHITESPACE: RegExp = /\s+/g;
// A narrow terminal wraps even the footer ("… · Esc to" / "cancel"), so markers are matched with whitespace removed.
const QUESTION_FOOTER: string = 'Entertoselect';
const REVIEW_MARKERS: readonly string[] = ['Readytosubmityouranswers?', '1.Submitanswers'];
const SUBMIT_ANSWERS: string = '1.Submitanswers';
// A window about 20 columns wide cuts the review's first row to "1. Submit" (or "1. Submit answ…"), and the
// leftover cells can trail "2. Cancel". A question tab could list the same two options, but it always keeps its
// footer, which the review has none of.
const REVIEW_ROWS: RegExp = /1\.Submit\p{L}*…?2\.Cancel/u;
// Only the preview layout offers notes ("n to add notes").
const PREVIEW_LAYOUT_MARKER: string = 'ntoaddnotes';
// "❯ 2. [✔] Banana": the row the picker's cursor is on, which a scrolled list always keeps in view.
const CURSOR_ROW: RegExp = /❯\s*(\d+)\.\s+(.*)$/;
const CHECKBOX: RegExp = /^\[(.)\]\s?(.*)$/;
const UNTICKED: string = ' ';
const EARLIER_PICK: RegExp = /\s+✔$/;
const ELLIPSIS: RegExp = /…$/;
// Options with previews share their row with the preview box drawn to the right.
const PREVIEW_BOX: RegExp = /[┌│└].*$/;
const REVIEW_QUESTION: RegExp = /^\s*●\s+(.*)$/;
const REVIEW_ANSWER: RegExp = /^\s*→\s+(.*)$/;
const CONTINUATION: RegExp = /^\s+\S/;

export interface CursorRow {
  readonly number: number;
  readonly label: string;
  // null on a single-select row, which has no checkbox.
  readonly ticked: boolean | null;
}

export function squeeze(text: string): string {
  return text.replace(WHITESPACE, '');
}

// Positive signs of the AskUserQuestion picker, however little of it fits on screen.
export function showsPicker(screen: string): boolean {
  const shown: string = squeeze(screen);
  return shown.includes(QUESTION_FOOTER) || REVIEW_MARKERS.some((marker: string) => shown.includes(marker)) || showsCutReviewRows(shown);
}

export function showsPreviewLayout(screen: string): boolean {
  return squeeze(screen).includes(PREVIEW_LAYOUT_MARKER);
}

export function showsReviewSubmit(screen: string): boolean {
  const shown: string = squeeze(screen);
  return shown.includes(SUBMIT_ANSWERS) || showsCutReviewRows(shown);
}

function showsCutReviewRows(shown: string): boolean {
  return REVIEW_ROWS.test(shown) && !shown.includes(QUESTION_FOOTER);
}

// True only on positive evidence that the picker on screen asks something else than this set.
export function contradictsSet(view: QuestionPicker | null, questions: readonly Question[]): boolean {
  if (view === null || view.kind === 'unreadable' || view.kind === 'set') return false;
  const headers: string[] = questions.map((question: Question) => question.header);
  if (view.tabs.length > 0 && view.tabs.some((tab, index: number) => squeeze(tab.header) !== squeeze(headers[index] ?? ''))) return true;
  if (view.kind === 'question') return !questions.some((question: Question) => sameText(question.question, view.question));
  return view.lines.some((line: PickerReviewLine) => !questions.some((question: Question) => sameText(question.question, line.question)));
}

export function cursorRow(screen: string): CursorRow | null {
  const line: string | undefined = screen.split('\n').find((candidate: string) => CURSOR_ROW.test(candidate));
  const match: RegExpExecArray | null = line === undefined ? null : CURSOR_ROW.exec(line);
  if (match === null) return null;
  const rest: string = (match[2] ?? '').replace(PREVIEW_BOX, '').trim();
  const box: RegExpExecArray | null = CHECKBOX.exec(rest);
  const label: string = (box === null ? rest.replace(EARLIER_PICK, '') : (box[2] ?? '')).trim();
  return { number: Number(match[1]), label, ticked: box === null ? null : box[1] !== UNTICKED };
}

// The terminal may cut a long label (wrapped or ending in "…"), so what is shown only has to start the real one.
export function labelMatches(shown: string, label: string): boolean {
  const visible: string = squeeze(shown.replace(ELLIPSIS, ''));
  return visible.length > 0 && squeeze(label).startsWith(visible);
}

// The review lines a cut-off screen still shows: a "● question" then its "→ answer"; a narrow window wraps both
// onto indented lines of their own.
export function visibleReviewLines(screen: string): PickerReviewLine[] {
  const lines: { question: string; answer: string }[] = [];
  let question: string | null = null;
  let answering: boolean = false;
  for (const raw of screen.split('\n')) {
    const line: string = withoutBorder(raw);
    const asked: RegExpExecArray | null = REVIEW_QUESTION.exec(line);
    const answered: RegExpExecArray | null = REVIEW_ANSWER.exec(line);
    const last: { question: string; answer: string } | undefined = lines.at(-1);
    const item: SplitItem | null = asked === null ? null : splitInlineAnswer((asked[1] ?? '').trim());
    if (item !== null && item.answer !== null) {
      lines.push({ question: item.question, answer: item.answer });
      question = null;
      answering = true;
      continue;
    }
    if (item !== null) question = item.question;
    else if (answered !== null && question !== null) lines.push({ question, answer: (answered[1] ?? '').trim() });
    else if (question !== null && CONTINUATION.test(line)) question = `${question} ${line.trim()}`;
    else if (answering && last !== undefined && CONTINUATION.test(line)) last.answer = `${last.answer} ${line.trim()}`;
    answering = answered !== null || (answering && asked === null && CONTINUATION.test(line));
    if (answered !== null) question = null;
  }
  return lines;
}

function sameText(left: string, right: string): boolean {
  return squeeze(left) === squeeze(right);
}
