import type { KeyChord, KeyStroke } from './key-chord';
import { chordMatches } from './key-chord';
import type { ActionShortcut } from './shortcut-types';

// The action a key press asks for, and which of its chords matched (Ctrl+3 is chord 2 of "open pinned chat").
export interface ShortcutMatch {
  readonly shortcut: ActionShortcut;
  readonly chordIndex: number;
}

export interface PressedKey extends KeyStroke {
  readonly repeat: boolean;
}

export function matchShortcut(shortcuts: readonly ActionShortcut[], pressed: PressedKey): ShortcutMatch | null {
  for (const shortcut of shortcuts) {
    if (pressed.repeat && shortcut.repeats !== true) continue;
    const chordIndex: number = shortcut.keys.findIndex((chord: KeyChord) => chordMatches(chord, pressed));
    if (chordIndex !== -1) return { shortcut, chordIndex };
  }
  return null;
}
