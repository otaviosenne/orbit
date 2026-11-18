// The keystrokes for filling a form's fields in order: each text, Tab to move to the next field, and Enter after
// the last only when the user asked for it. Kept pure so the order is tested without touching the keyboard.
export type TypingKey = 'Tab' | 'Return';

export type TypingStep =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'key'; readonly key: TypingKey };

const NEXT_FIELD: TypingStep = { kind: 'key', key: 'Tab' };
const SUBMIT: TypingStep = { kind: 'key', key: 'Return' };

export function typingPlan(texts: readonly string[], pressEnter: boolean): readonly TypingStep[] {
  const steps: TypingStep[] = texts.flatMap((text: string, index: number): TypingStep[] =>
    index === 0 ? [{ kind: 'text', text }] : [NEXT_FIELD, { kind: 'text', text }],
  );
  return pressEnter && steps.length > 0 ? [...steps, SUBMIT] : steps;
}
