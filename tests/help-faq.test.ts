import { describe, expect, it } from 'vitest';
import type { FaqEntry } from '../src/renderer/help/faq';
import { FAQ } from '../src/renderer/help/faq';
import { resolveKeyTokens, unknownKeyTokens } from '../src/renderer/help/faq-text';

const MIN_QUESTIONS: number = 20;
const MAX_QUESTIONS: number = 30;

describe('common questions', () => {
  it('has 20 to 30 entries with unique ids and nothing empty', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
    expect(FAQ.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(new Set(FAQ.map((entry: FaqEntry) => entry.id)).size).toBe(FAQ.length);
    for (const entry of FAQ) {
      expect(entry.question.trim()).not.toBe('');
      expect(entry.answer.trim()).not.toBe('');
    }
  });

  it('quotes only keys that exist in the shortcut registry', () => {
    expect(FAQ.flatMap((entry: FaqEntry) => unknownKeyTokens(entry.answer))).toEqual([]);
    expect(unknownKeyTokens('Press {key:no-such-shortcut}.')).toEqual(['no-such-shortcut']);
  });

  it('fills in the keys from the registry', () => {
    expect(resolveKeyTokens('Press {key:chat-pin} or {key:chat-close}.')).toBe('Press P or Ctrl+Backspace.');
    expect(FAQ.some((entry: FaqEntry) => resolveKeyTokens(entry.answer).includes('{key:'))).toBe(false);
  });
});
