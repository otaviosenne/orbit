import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePicker } from '../src/main/questions/screen/picker-parser';

// Screens captured with `kitty @ get-text` from a throwaway chat asking AskUserQuestion.
function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'picker', name), 'utf8');
}

describe('parsePicker', () => {
  it('reads a lone single-choice question, with no review step', () => {
    expect(parsePicker(fixture('lone-single.txt'))).toMatchObject({
      kind: 'question',
      tabs: [{ header: 'Size', answered: false }],
      current: null,
      hasReview: false,
      question: 'Which size do you prefer?',
      multiSelect: false,
      options: [
        { label: 'Small', description: 'Small size', ticked: false },
        { label: 'Medium', description: 'Medium size', ticked: false },
        { label: 'Large', description: 'Large size', ticked: false },
      ],
      other: null,
    });
  });

  it('finds the tab on screen from its background color', () => {
    expect(parsePicker(fixture('lone-single.ansi.txt'))).toMatchObject({ kind: 'question', current: 0, question: 'Which size do you prefer?' });
  });

  it('reads a multi-select tab with its ticks and typed text, ignoring numbered lists above it', () => {
    expect(parsePicker(fixture('multi-tab.txt'))).toMatchObject({
      kind: 'question',
      tabs: [{ header: 'Color', answered: true }, { header: 'Fruits', answered: false }],
      hasReview: true,
      question: 'Which fruits do you like?',
      multiSelect: true,
      options: [
        { label: 'Apple', description: 'A crisp apple', ticked: true },
        { label: 'Banana', ticked: false },
        { label: 'Cherry', ticked: true },
      ],
      other: 'Kiwi from Orbit',
    });
  });

  it('joins wrapped lines and drops the mark of an earlier pick', () => {
    expect(parsePicker(fixture('single-tab-earlier-pick.txt'))).toMatchObject({
      question: 'Which color do you prefer? This question is long enough that the terminal wraps it onto a second line.',
      options: [
        { label: 'Red' },
        { label: 'Green', description: 'The color green, a description that also runs long enough to wrap onto another line' },
        { label: 'Blue' },
      ],
      other: null,
    });
  });

  it('reads the review step', () => {
    expect(parsePicker(fixture('review.txt'))).toMatchObject({
      kind: 'review',
      tabs: [{ header: 'Color', answered: true }, { header: 'Fruits', answered: true }],
      lines: [
        { question: 'Which color do you prefer?', answer: 'Purple, dark' },
        { question: 'Which fruits do you like?', answer: 'Apple, Cherry, Banana, Mango' },
      ],
    });
  });

  it('follows a real two-question round: tab one, tab two with a tick from the terminal, then the review', () => {
    expect(parsePicker(fixture('two-questions-first.ansi.txt'))).toMatchObject({
      kind: 'question', current: 0, hasReview: true, multiSelect: false, question: 'Which color do you prefer?',
      tabs: [{ header: 'Color', answered: false }, { header: 'Fruits', answered: false }],
    });
    expect(parsePicker(fixture('two-questions-second.ansi.txt'))).toMatchObject({
      kind: 'question', current: 1, multiSelect: true, question: 'Which fruits do you like?',
      options: [{ label: 'Apple', ticked: false }, { label: 'Banana', ticked: true }, { label: 'Cherry', ticked: false }],
      other: null,
    });
    expect(parsePicker(fixture('two-questions-review.ansi.txt'))).toMatchObject({
      kind: 'review',
      lines: [
        { question: 'Which color do you prefer?', answer: 'Teal, bright' },
        { question: 'Which fruits do you like?', answer: 'Apple, Cherry, Kiwi' },
      ],
    });
  });

  it('gives up on the option-preview layout instead of guessing its rows', () => {
    expect(parsePicker(fixture('preview-options.ansi.txt'))).toEqual({ kind: 'unreadable' });
  });

  it('ignores other prompts and plain chat screens', () => {
    expect(parsePicker(fixture('permission-prompt.txt'))).toBeNull();
    expect(parsePicker('❯ Try "write a test"\n──────\n  ⏵⏵ bypass permissions on')).toBeNull();
  });

  it('keeps the fingerprint stable for the same screen and different across questions', () => {
    const first = parsePicker(fixture('multi-tab.txt'));
    expect(parsePicker(fixture('multi-tab.txt'))).toEqual(first);
    expect(parsePicker(fixture('single-tab-earlier-pick.txt'))).not.toMatchObject({ fingerprint: (first as { fingerprint: string }).fingerprint });
  });
});
