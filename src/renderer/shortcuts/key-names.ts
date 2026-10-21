import type { KeyChord } from './key-chord';

// How one key is printed: the macOS-style glyph on the keycap and the spoken name (tooltips and search).
export interface KeyCap {
  readonly glyph: string;
  readonly name: string;
}

const NAMED_KEYS: Readonly<Record<string, KeyCap>> = {
  ' ': { glyph: 'Space', name: 'Space' },
  Enter: { glyph: '↩', name: 'Enter' },
  Escape: { glyph: 'esc', name: 'Esc' },
  Backspace: { glyph: '⌫', name: 'Backspace' },
  ArrowUp: { glyph: '↑', name: 'Up' },
  ArrowDown: { glyph: '↓', name: 'Down' },
  ArrowLeft: { glyph: '←', name: 'Left' },
  ArrowRight: { glyph: '→', name: 'Right' },
  Wheel: { glyph: 'Scroll', name: 'Wheel' },
};

const CTRL_CAP: KeyCap = { glyph: '⌃ Ctrl', name: 'Ctrl' };
const SHIFT_CAP: KeyCap = { glyph: '⇧ Shift', name: 'Shift' };
const ALT_CAP: KeyCap = { glyph: '⌥ Alt', name: 'Alt' };

export function keyCap(key: string): KeyCap {
  const named: KeyCap | undefined = NAMED_KEYS[key];
  if (named !== undefined) return named;
  const label: string = key.toUpperCase();
  return { glyph: label, name: label };
}

// Modifiers first, in the order macOS menus print them.
export function chordCaps(chord: KeyChord): readonly KeyCap[] {
  return [
    ...(chord.ctrl === true ? [CTRL_CAP] : []),
    ...(chord.alt === true ? [ALT_CAP] : []),
    ...(chord.shift === true ? [SHIFT_CAP] : []),
    keyCap(chord.key),
  ];
}

// "Ctrl+Backspace", as a tooltip writes it.
export function chordText(chord: KeyChord): string {
  return chordCaps(chord).map((cap: KeyCap) => cap.name).join('+');
}
