import { describe, expect, it } from 'vitest';
import { SetDriver } from '../src/main/questions/set-driver';
import { reviewProblem } from '../src/main/questions/set-review';
import { visibleReviewLines } from '../src/main/questions/screen/picker-evidence';
import type { Question, QuestionAnswer } from '../src/shared/types';
import { FakePicker } from './support/fake-picker';

function question(header: string, multiSelect: boolean, labels: string[]): Question {
  return { question: `Which ${header.toLowerCase()}?`, header, multiSelect, hasPreviews: false, options: labels.map((label: string) => ({ label, description: '' })) };
}

const color: Question = question('Color', false, ['Red', 'Green', 'Blue']);
const fruits: Question = question('Fruits', true, ['Apple', 'Banana', 'Cherry', 'Durian']);
const size: Question = question('Size', false, ['Small', 'Large']);

async function driveAndSubmit(picker: FakePicker, questions: Question[], answers: QuestionAnswer[]): Promise<string | null> {
  const problem: string | null = await new SetDriver(picker).answer(questions, answers);
  if (problem !== null) return problem;
  const review: string | null = reviewProblem(visibleReviewLines(await picker.plainScreen()), questions, answers);
  if (review !== null) return review;
  await picker.run([{ kind: 'text', text: '1' }]);
  return null;
}

describe('SetDriver on a picker showing only the cursor row', () => {
  it('answers three tabs from wherever the user left the picker, keeping and undoing earlier ticks', async () => {
    const picker: FakePicker = new FakePicker([color, fruits, size]);
    // The user wandered: Banana ticked, text typed in the field, now on the last tab with the cursor on its field.
    Object.assign(picker.tabs[1] as object, { ticked: [1], field: 'old note', cursor: 2 });
    picker.tab = 2;
    Object.assign(picker.tabs[2] as object, { cursor: 2 });
    const answers: QuestionAnswer[] = [{ selected: [], other: 'Teal' }, { selected: [0, 2], other: null }, { selected: [1], other: null }];
    expect(await driveAndSubmit(picker, [color, fruits, size], answers)).toBeNull();
    expect(picker.submitted).toEqual(['Teal', 'Apple, Cherry', 'Large']);
  });

  it('sends a lone single choice by its number, with no review', async () => {
    const picker: FakePicker = new FakePicker([size]);
    expect(await new SetDriver(picker).answer([size], [{ selected: [0], other: null }])).toBeNull();
    expect(picker.submitted).toEqual(['Small']);
  });

  it('never picks blind in a set whose preview layout hides the cursor, since the tab on screen is unproven', async () => {
    const previews: Question = { ...size, hasPreviews: true };
    const picker: FakePicker = new FakePicker([previews, color]);
    picker.hidesCursorInPreview = true;
    expect(await new SetDriver(picker).answer([previews, color], [{ selected: [1], other: null }, { selected: [0], other: null }])).toMatch(/not on screen/);
    expect(picker.typed).toEqual([]);
  });

  it('refuses when the cursor row shows another question', async () => {
    const picker: FakePicker = new FakePicker([question('Pets', false, ['Cat', 'Dog'])]);
    expect(await new SetDriver(picker).answer([size], [{ selected: [0], other: null }])).toMatch(/different question/);
    expect(picker.submitted).toBeNull();
  });
});

describe('reviewProblem', () => {
  const answers: QuestionAnswer[] = [{ selected: [0], other: null }, { selected: [0, 2], other: 'Kiwi' }];

  it('accepts ticks listed in any order and ignores lines cut off the screen', () => {
    const lines = [{ question: 'Which fruits?', answer: 'Cherry, Apple, Kiwi' }];
    expect(reviewProblem(lines, [color, fruits], answers)).toBeNull();
  });

  it('flags an answer that differs from the one sent', () => {
    const lines = [{ question: 'Which fruits?', answer: 'Apple, Banana, Cherry, Kiwi' }];
    expect(reviewProblem(lines, [color, fruits], answers)).toMatch(/Fruits/);
  });
});
