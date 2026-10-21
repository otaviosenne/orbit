import type { PickerReviewLine } from '../../../shared/types';
import { splitInlineAnswer, withoutBorder } from './review-line';

// " ● Which color do you prefer?" then "   → Green"; either may wrap onto indented lines.
const QUESTION_MARK: RegExp = /^\s*●\s+(.*)$/;
const ANSWER_MARK: RegExp = /^\s*→\s+(.*)$/;
const REVIEW_TITLE: string = 'Review your answers';
const READY_PROMPT: string = 'Ready to submit your answers?';

// The lines between the tab bar and "1. Submit answers".
export function parseReviewBody(lines: readonly string[]): PickerReviewLine[] | null {
  if (!lines.some((line: string) => line.trim() === REVIEW_TITLE)) return null;
  const parsed: { question: string; answer: string | null }[] = [];
  for (const raw of lines) {
    const line: string = withoutBorder(raw);
    const text: string = line.trim();
    if (text.length === 0 || text === REVIEW_TITLE || text === READY_PROMPT) continue;
    const question: RegExpExecArray | null = QUESTION_MARK.exec(line);
    const answer: RegExpExecArray | null = ANSWER_MARK.exec(line);
    const last: { question: string; answer: string | null } | undefined = parsed.at(-1);
    if (question !== null) parsed.push(splitInlineAnswer((question[1] ?? '').trim()));
    else if (last === undefined) return null;
    else if (answer !== null) last.answer = (answer[1] ?? '').trim();
    else if (last.answer === null) last.question = `${last.question} ${text}`;
    else last.answer = `${last.answer} ${text}`;
  }
  return parsed.length > 0 && parsed.every((line) => line.answer !== null)
    ? parsed.map((line): PickerReviewLine => ({ question: line.question, answer: line.answer ?? '' }))
    : null;
}
