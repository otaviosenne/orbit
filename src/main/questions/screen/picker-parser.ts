import type { PickerQuestionView, PickerReviewLine, PickerReviewView, QuestionPicker } from '../../../shared/types';
import type { StyledLine } from './ansi-line';
import { parseStyledLine } from './ansi-line';
import type { QuestionBody } from './question-body';
import { parseQuestionBody } from './question-body';
import { showsPicker, squeeze } from './picker-evidence';
import { parseReviewBody } from './review-body';
import type { TabBar } from './tab-bar';
import { isTabBar, parseTabBar } from './tab-bar';

// Only the picker's own block at the bottom of the screen is read, never numbered lists earlier in the chat.
// A narrow terminal wraps the footer too, so it is looked for with the whitespace removed.
const PICKER_FOOTER: string = 'Esctocancel';
const CHAT_ROW: RegExp = /^\s*(?:❯\s*)?\d+\.\s+Chat about this\s*$/;
const SUBMIT_ANSWERS_ROW: RegExp = /^\s*(?:❯\s*)?1\.\s+Submit answers\s*$/;
const SEPARATOR: RegExp = /^─+$/;
// How far above its anchor the tab bar may sit: a question with long option descriptions fills most of a screen.
const MAX_PICKER_LINES: number = 60;

// Reads Claude Code's AskUserQuestion picker off a `kitty @ get-text --ansi` capture; null when none is showing.
export function parsePicker(ansiScreen: string): QuestionPicker | null {
  const lines: StyledLine[] = ansiScreen.split('\n').map(parseStyledLine);
  const texts: string[] = lines.map((line: StyledLine) => line.text.trimEnd());
  const review: PickerReviewView | null = readReview(lines, texts);
  if (review !== null) return review;
  if (!squeeze(texts.join('')).includes(PICKER_FOOTER)) return null;
  // A picker cut off by a small window, or in a layout this parser does not know, is still a picker.
  return readQuestion(lines, texts) ?? (hasTabBarNearEnd(texts) || showsPicker(texts.join('\n')) ? { kind: 'unreadable' } : null);
}

function readQuestion(lines: readonly StyledLine[], texts: readonly string[]): PickerQuestionView | null {
  const chatRow: number = lastIndex(texts, (text: string) => CHAT_ROW.test(text));
  if (chatRow < 1 || !SEPARATOR.test((texts[chatRow - 1] ?? '').trim())) return null;
  const barIndex: number = tabBarAbove(texts, chatRow - 1);
  const bar: TabBar | null = barIndex === -1 ? null : parseTabBar(lines[barIndex] as StyledLine);
  const body: QuestionBody | null = bar === null ? null : parseQuestionBody(texts.slice(barIndex + 1, chatRow - 1));
  if (bar === null || body === null) return null;
  const fingerprint: string = ['question', bar.current, body.question, ...body.options.map((option) => option.label)].join('\n');
  return { kind: 'question', fingerprint, tabs: bar.tabs, current: bar.current, hasReview: bar.hasReview, ...body };
}

function readReview(lines: readonly StyledLine[], texts: readonly string[]): PickerReviewView | null {
  const submitRow: number = lastIndex(texts, (text: string) => SUBMIT_ANSWERS_ROW.test(text));
  const barIndex: number = submitRow === -1 ? -1 : tabBarAbove(texts, submitRow);
  const bar: TabBar | null = barIndex === -1 ? null : parseTabBar(lines[barIndex] as StyledLine);
  const reviewLines: PickerReviewLine[] | null = bar === null ? null : parseReviewBody(texts.slice(barIndex + 1, submitRow));
  if (bar === null || reviewLines === null) return null;
  const fingerprint: string = ['review', ...reviewLines.map((line: PickerReviewLine) => `${line.question}\u0000${line.answer}`)].join('\n');
  return { kind: 'review', fingerprint, tabs: bar.tabs, lines: reviewLines };
}

function tabBarAbove(texts: readonly string[], below: number): number {
  for (let index: number = below - 1; index >= Math.max(0, below - MAX_PICKER_LINES); index--) {
    if (isTabBar(texts[index] ?? '')) return index;
  }
  return -1;
}

function hasTabBarNearEnd(texts: readonly string[]): boolean {
  return tabBarAbove(texts, texts.length) !== -1;
}

function lastIndex(texts: readonly string[], matches: (text: string) => boolean): number {
  for (let index: number = texts.length - 1; index >= 0; index--) if (matches(texts[index] ?? '')) return index;
  return -1;
}
