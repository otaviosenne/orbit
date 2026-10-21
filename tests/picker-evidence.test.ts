import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../src/main/questions/screen/ansi-line';
import { contradictsSet, cursorRow, labelMatches, showsPicker, showsReviewSubmit, visibleReviewLines } from '../src/main/questions/screen/picker-evidence';
import { parsePicker } from '../src/main/questions/screen/picker-parser';
import type { Question } from '../src/shared/types';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'picker', name), 'utf8');
}

function question(text: string, header: string, multiSelect: boolean, size: number): Question {
  const options = Array.from({ length: size }, (_: unknown, index: number) => ({ label: `Option ${index + 1}`, description: '' }));
  return { question: text, header, multiSelect, hasPreviews: false, options };
}

describe('picker evidence on a terminal too small for the picker', () => {
  it('sees the picker by its wrapped footer even with the options cut off', () => {
    const screen: string = stripAnsi(fixture('cut-off-small-window.ansi.txt'));
    expect(showsPicker(screen)).toBe(true);
    expect(parsePicker(fixture('cut-off-small-window.ansi.txt'))).toEqual({ kind: 'unreadable' });
    expect(showsPicker('❯ Try "write a test"\n──────\n  ⏵⏵ bypass permissions on')).toBe(false);
  });

  it('reads the review lines that are still visible', () => {
    const screen: string = stripAnsi(fixture('cut-off-review.ansi.txt'));
    expect(showsPicker(screen)).toBe(true);
    expect(visibleReviewLines(screen)).toEqual([
      { question: 'Which fruits do you like?', answer: 'Apple, Cherry' },
      { question: 'Which size do you want?', answer: 'Large' },
    ]);
  });

  it('reads the cursor row, with its tick, and matches labels the terminal cut short', () => {
    expect(cursorRow('Which fruits?\n\n❯ 2. [✔] Banana\n────')).toEqual({ number: 2, label: 'Banana', ticked: true });
    expect(cursorRow('❯ 1. Red ✔')).toEqual({ number: 1, label: 'Red', ticked: null });
    expect(cursorRow('❯ 1. Flat                         ┌──────────┐')).toEqual({ number: 1, label: 'Flat', ticked: null });
    expect(labelMatches('Quarentena primeiro (Reco…', 'Quarentena primeiro (Recomendado)')).toBe(true);
    expect(labelMatches('Banana', 'Apple')).toBe(false);
  });

  it('calls a visible tab bar or question that differs from the set a contradiction, and nothing visible none', () => {
    const fruits: Question = question('Which fruits do you like?', 'Fruits', true, 3);
    const color: Question = question('Which color do you prefer?', 'Color', false, 3);
    expect(contradictsSet(parsePicker(fixture('two-questions-second.ansi.txt')), [color, fruits])).toBe(false);
    expect(contradictsSet(parsePicker(fixture('two-questions-second.ansi.txt')), [fruits, color])).toBe(true);
    expect(contradictsSet(parsePicker(fixture('cut-off-small-window.ansi.txt')), [fruits])).toBe(false);
  });

  it('reads a real 2.1.306 capture of a last multi-select tab', () => {
    expect(parsePicker(fixture('v306-multi-last-tab.ansi.txt'))).toMatchObject({
      kind: 'question', current: 1, multiSelect: true, other: null, question: 'Which fruits do you like?',
      options: [{ label: 'Apple', description: 'Crisp' }, { label: 'Banana' }, { label: 'Cherry' }],
    });
  });

  it('reads a 2.1.306 multi-select tab whose row under the field says "Next"', () => {
    expect(parsePicker(fixture('multi-tab-next-row.txt'))).toMatchObject({
      kind: 'question', multiSelect: true, other: null,
      options: [{ label: 'Apple', ticked: false }, { label: 'Banana', ticked: true }, { label: 'Cherry', ticked: false }],
    });
  });
});

describe('picker evidence in a window about 18 columns wide', () => {
  const language: Question = { ...question('Which language do you prefer?', 'Lang', false, 3), options: ['TypeScript', 'Internationalization', 'Go'].map((label: string) => ({ label, description: label })) };

  it('sees the picker by a footer wrapped over several lines, with the tab bar scrolled away', () => {
    const screen: string = stripAnsi(fixture('narrow-wrapped-footer.ansi.txt'));
    expect(showsPicker(screen)).toBe(true);
    expect(showsPicker('Enter to select ·\nTab/Arrow keys to\nnavigate · Esc to\ncancel\n───── Questions demo ─')).toBe(true);
    expect(contradictsSet(parsePicker(fixture('narrow-wrapped-footer.ansi.txt')), [language])).toBe(false);
    expect(cursorRow(screen)).toEqual({ number: 1, label: 'TypeScript', ticked: null });
    expect(labelMatches('International', 'Internationalization')).toBe(true);
  });

  it('sees the review although its rows are cut to "1. Submit" and its questions wrap', () => {
    const screen: string = stripAnsi(fixture('narrow-review.ansi.txt'));
    expect(showsPicker(screen)).toBe(true);
    expect(showsReviewSubmit(screen)).toBe(true);
    expect(showsReviewSubmit('❯ 1. Submit answ…\n  2. Cancel')).toBe(true);
    expect(showsReviewSubmit('❯ 1. Submit\n  2. Green')).toBe(false);
    expect(showsReviewSubmit('❯ 1. Submit\n     Send it\n  2. Cancel\n\nEnter to select ·\nTab/Arrow keys to\nnavigate')).toBe(false);
    expect(visibleReviewLines(screen)).toEqual([
      { question: 'Which color do you prefer?', answer: 'Red' },
      { question: 'Which fruits do you like?', answer: 'Apple, Cherry' },
    ]);
  });
});
