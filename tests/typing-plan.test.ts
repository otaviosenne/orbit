import { describe, expect, it } from 'vitest';
import type { TypingStep } from '../src/main/remote-typing/typing-plan';
import { typingPlan } from '../src/main/remote-typing/typing-plan';

describe('typingPlan', () => {
  it('types one text and nothing else when Enter is off', () => {
    expect(typingPlan(['s3cret'], false)).toEqual([{ kind: 'text', text: 's3cret' }]);
  });

  it('types the texts in order with Tab between them and Enter only after the last', () => {
    expect(typingPlan(['a@b.c', 'p4ss', 'word'], true)).toEqual([
      { kind: 'text', text: 'a@b.c' },
      { kind: 'key', key: 'Tab' },
      { kind: 'text', text: 'p4ss' },
      { kind: 'key', key: 'Tab' },
      { kind: 'text', text: 'word' },
      { kind: 'key', key: 'Return' },
    ]);
  });

  it('never ends on a Tab, and keys never carry the user text', () => {
    const steps: readonly TypingStep[] = typingPlan(['one', 'two'], false);
    expect(steps.at(-1)).toEqual({ kind: 'text', text: 'two' });
    for (const step of steps) if (step.kind === 'key') expect(['Tab', 'Return']).toContain(step.key);
  });

  it('presses nothing when there is nothing to type', () => {
    expect(typingPlan([], true)).toEqual([]);
  });
});
