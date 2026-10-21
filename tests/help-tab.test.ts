import { describe, expect, it } from 'vitest';
import type { HelpTab } from '../src/renderer/help/help-tab';
import { availableHelpTabs, initialHelpTab, otherTabMatchesLabel, parseHelpTab, steppedHelpTab } from '../src/renderer/help/help-tab';

const BOTH: readonly HelpTab[] = ['shortcuts', 'questions'];
const QUESTIONS_ONLY: readonly HelpTab[] = ['questions'];
const PREVIOUS: number = -1;
const NEXT: number = 1;
const SHORTCUT_COUNT: number = 40;
const QUESTION_COUNT: number = 28;
const ONE_MATCH: number = 1;
const SEVERAL_MATCHES: number = 3;

describe('help tabs', () => {
  it('reads back only a known tab', () => {
    expect(parseHelpTab('questions')).toBe('questions');
    expect(parseHelpTab('shortcuts')).toBe('shortcuts');
    expect(parseHelpTab('faq')).toBeNull();
    expect(parseHelpTab(null)).toBeNull();
  });

  it('offers a tab only for a part with entries, in a fixed order', () => {
    expect(availableHelpTabs({ shortcuts: SHORTCUT_COUNT, questions: QUESTION_COUNT })).toEqual(BOTH);
    expect(availableHelpTabs({ shortcuts: 0, questions: QUESTION_COUNT })).toEqual(QUESTIONS_ONLY);
    expect(availableHelpTabs({ shortcuts: 0, questions: 0 })).toEqual([]);
  });

  it('opens on the last picked tab while the host still has it', () => {
    expect(initialHelpTab('questions', BOTH, false)).toBe('questions');
    expect(initialHelpTab('shortcuts', BOTH, true)).toBe('shortcuts');
    expect(initialHelpTab('shortcuts', QUESTIONS_ONLY, false)).toBe('questions');
  });

  it('starts a touch screen on Questions and a keyboard on Shortcuts when nothing was picked', () => {
    expect(initialHelpTab(null, BOTH, true)).toBe('questions');
    expect(initialHelpTab(null, BOTH, false)).toBe('shortcuts');
    expect(initialHelpTab(null, ['shortcuts'], true)).toBe('shortcuts');
  });

  it('steps through the tabs with wrap-around', () => {
    expect(steppedHelpTab(BOTH, 'shortcuts', NEXT)).toBe('questions');
    expect(steppedHelpTab(BOTH, 'questions', NEXT)).toBe('shortcuts');
    expect(steppedHelpTab(BOTH, 'shortcuts', PREVIOUS)).toBe('questions');
    expect(steppedHelpTab(QUESTIONS_ONLY, 'questions', NEXT)).toBe('questions');
    expect(steppedHelpTab([], 'questions', NEXT)).toBe('questions');
  });

  it('names the matches waiting in another tab', () => {
    expect(otherTabMatchesLabel('questions', ONE_MATCH)).toBe('1 match in Questions');
    expect(otherTabMatchesLabel('shortcuts', SEVERAL_MATCHES)).toBe('3 matches in Shortcuts');
  });
});
