import type { ShortcutBinding } from '../shortcut-dispatcher';

// A binding that applies whenever its predicate holds and ignores which chord was pressed.
export function when(enabled: () => boolean, run: () => void): ShortcutBinding {
  return { enabled: (): boolean => enabled(), run: (): void => run() };
}

export function always(run: () => void): ShortcutBinding {
  return when((): boolean => true, run);
}
