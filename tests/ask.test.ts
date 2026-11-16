import { describe, expect, it } from 'vitest';
import { askReply, isAskAnswer, isAskChoice, MAX_ASK_OPTIONS, MAX_LABEL_LENGTH, parseAsk } from '../src/shared/ask';
import type { AskRequest } from '../src/shared/ask';

const REQUEST: AskRequest = {
  question: 'Which layout should the grid use?',
  options: [{ label: 'Square', description: 'Fills the screen' }, { label: 'Row', description: '' }],
  requestedAt: 5_000,
};

describe('ask requests', () => {
  it('reads a request, putting every text on one line and filling a missing description', () => {
    const raw = { question: '  Which\nlayout?  ', options: [{ label: 'A\nB' }, { label: 'C', description: 'd' }], requestedAt: 3 };
    expect(parseAsk(raw)).toEqual({ question: 'Which layout?', options: [{ label: 'A B', description: '' }, { label: 'C', description: 'd' }], requestedAt: 3 });
  });

  it('caps a long label', () => {
    expect(parseAsk({ ...REQUEST, options: [{ label: 'x'.repeat(MAX_LABEL_LENGTH + 5) }, { label: 'y' }] })?.options[0]?.label).toHaveLength(MAX_LABEL_LENGTH);
  });

  it('refuses too few or too many options, an empty label or an empty question', () => {
    expect(parseAsk({ ...REQUEST, options: [{ label: 'only' }] })).toBeNull();
    expect(parseAsk({ ...REQUEST, options: Array.from({ length: MAX_ASK_OPTIONS + 1 }, (_: unknown, index: number) => ({ label: `${index}` })) })).toBeNull();
    expect(parseAsk({ ...REQUEST, options: [{ label: '  ' }, { label: 'b' }] })).toBeNull();
    expect(parseAsk({ ...REQUEST, question: ' ' })).toBeNull();
    expect(parseAsk(null)).toBeNull();
  });

  it('answers with the picked label and the question, so the chat knows which ask it settles', () => {
    expect(askReply(REQUEST, 0)).toBe('Answered in Orbit: Square (Question: Which layout should the grid use?)');
  });

  it('accepts only an option that exists, or a reply in the chat', () => {
    expect(isAskChoice(REQUEST, 1)).toBe(true);
    expect(isAskChoice(REQUEST, 2)).toBe(false);
    expect(isAskChoice(REQUEST, 0.5)).toBe(false);
    expect(isAskAnswer('chat')).toBe(true);
    expect(isAskAnswer(-1)).toBe(false);
    expect(isAskAnswer('approve')).toBe(false);
  });
});
