// What a key pressed on a focused row asks for: step the focus, move the row (manual order only), or nothing.
export type RowKeyAction = { readonly kind: 'focus'; readonly step: -1 | 1 } | { readonly kind: 'move'; readonly step: -1 | 1 } | null;

// The parts of a KeyboardEvent this reads, so it can be tested without a DOM.
export interface RowKeyStroke {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

const KEY_STEPS: Readonly<Record<string, -1 | 1>> = { ArrowUp: -1, ArrowDown: 1 };

// Alt, like moving a line in an editor; plain arrows walk the rows.
export function rowKeyAction(stroke: RowKeyStroke): RowKeyAction {
  const step: -1 | 1 | undefined = KEY_STEPS[stroke.key];
  if (step === undefined || stroke.ctrlKey || stroke.metaKey || stroke.shiftKey) return null;
  return { kind: stroke.altKey ? 'move' : 'focus', step };
}
