import type { KeyChord } from './key-chord';
import { chordText } from './key-names';
import { actionShortcut } from './shortcut-catalog';
import type { ActionShortcutId, Shortcut } from './shortcut-types';

const ALTERNATIVE_SEPARATOR: string = ' or ';

export function shownChords(shortcut: Shortcut): readonly KeyChord[] {
  return shortcut.display ?? shortcut.keys;
}

// "F2 or E", as a tooltip writes a shortcut's keys.
export function shortcutKeysText(shortcut: Shortcut): string {
  return shownChords(shortcut).map(chordText).join(ALTERNATIVE_SEPARATOR);
}

// "Rename (F2 or E)": tooltips read their keys from the registry, so they follow any change to it.
export function withShortcut(label: string, id: ActionShortcutId): string {
  return `${label} (${shortcutKeysText(actionShortcut(id))})`;
}
