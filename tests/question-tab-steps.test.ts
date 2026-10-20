import { describe, expect, it } from 'vitest';
import { tabSteps } from '../src/main/questions/answer-plan';
import { checkAnswer } from '../src/main/questions/answer-validation';
import type { PickerStep } from '../src/main/questions/picker-keys';
import type { PickerChoice, PickerQuestionView } from '../src/shared/types';

function choices(...ticked: boolean[]): PickerChoice[] {
  return ticked.map((isTicked: boolean, index: number): PickerChoice => ({ label: `Option ${index + 1}`, description: '', ticked: isTicked }));
}

function view(multiSelect: boolean, options: PickerChoice[]): PickerQuestionView {
  return { kind: 'question', fingerprint: 'f', tabs: [], current: 0, question: 'Q?', multiSelect, options, other: null, hasReview: true };
}

// The plan as the keystrokes a person would press, for readable expectations.
function strokes(steps: readonly PickerStep[]): string[] {
  return steps.map((step: PickerStep) => (step.kind === 'keys' ? `${step.keys[0]}×${step.keys.length}` : JSON.stringify(step.text)));
}

describe('tabSteps', () => {
  it('parks at the bottom, climbs to the first option and types its number for a single choice', () => {
    expect(strokes(tabSteps(view(false, choices(false, false, false)), { selected: [1], other: null }))).toEqual(['down×5', 'up×4', '"2"']);
  });

  it('types a single-choice "Other" answer on one line into the cleared field and enters it', () => {
    expect(strokes(tabSteps(view(false, choices(false, false, false)), { selected: [], other: 'Teal,\nbright' }))).toEqual([
      'down×5', 'up×1', '"\\u0015"', '"Teal, bright"', 'enter×1',
    ]);
  });

  it('toggles only the boxes that differ from the screen, then clears the field and submits the tab', () => {
    const steps: PickerStep[] = tabSteps(view(true, choices(false, true, false)), { selected: [0, 2], other: 'Kiwi' });
    expect(strokes(steps)).toEqual(['down×6', 'up×5', '"1"', '"2"', '"3"', 'down×6', 'up×2', '"\\u0015"', '"Kiwi"', 'down×1', 'enter×1']);
  });

  it('presses no box when the screen already shows the wanted ticks', () => {
    expect(strokes(tabSteps(view(true, choices(true, false)), { selected: [0], other: null }))).toEqual(['down×5', 'up×4', 'down×5', 'up×2', '"\\u0015"', 'down×1', 'enter×1']);
  });
});

describe('checkAnswer', () => {
  const single: PickerQuestionView = view(false, choices(false, false));
  const multi: PickerQuestionView = view(true, choices(false, false));

  it('accepts one option or the "Other" text for a single choice, and a mix for a multi-select', () => {
    expect(checkAnswer(single, { selected: [1], other: null })).toEqual({ ok: true, answer: { selected: [1], other: null } });
    expect(checkAnswer(single, { selected: [], other: ' Teal ' })).toEqual({ ok: true, answer: { selected: [], other: 'Teal' } });
    expect(checkAnswer(multi, { selected: [0, 0, 1], other: 'Kiwi' })).toEqual({ ok: true, answer: { selected: [0, 1], other: 'Kiwi' } });
  });

  it('rejects missing, extra, unknown or unreadable picks', () => {
    expect(checkAnswer(single, { selected: [0, 1], other: null })).toEqual({ ok: false, error: 'Pick only one option' });
    expect(checkAnswer(single, { selected: [], other: '   ' })).toEqual({ ok: false, error: 'Pick an option' });
    expect(checkAnswer(multi, { selected: [5], other: null })).toEqual({ ok: false, error: 'Unknown option' });
    expect(checkAnswer(multi, { selected: ['0'], other: null })).toEqual({ ok: false, error: 'Unreadable answer' });
  });
});
