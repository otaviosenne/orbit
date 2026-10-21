import { element } from '../dom';
import type { KeyChord } from '../shortcuts/key-chord';
import type { KeyCap } from '../shortcuts/key-names';
import { chordCaps } from '../shortcuts/key-names';
import { shownChords } from '../shortcuts/shortcut-hint';
import type { KeyGesture, Shortcut } from '../shortcuts/shortcut-types';
import { foldText } from './text-search';

// A single letter only marks the key it names exactly; from two letters on, it marks keys it starts.
const MIN_PREFIX_LENGTH: number = 2;
const GESTURE_WORDS: Readonly<Record<KeyGesture, string>> = { hold: 'Hold', 'double-tap': 'Double-tap' };

// Every word a search can find a shortcut's keys by: glyphs and spoken names ("⇧" and "Shift").
export function keySearchWords(shortcut: Shortcut): readonly string[] {
  const caps: readonly KeyCap[] = shownChords(shortcut).flatMap(chordCaps);
  const gesture: readonly string[] = shortcut.gesture === undefined ? [] : [GESTURE_WORDS[shortcut.gesture]];
  return [...gesture, ...caps.flatMap((cap: KeyCap) => [cap.glyph, cap.name])];
}

// The keys as macOS-style keycaps: "⌃ Ctrl" + "⌫", alternatives split by "or". Keycaps a search term names
// light up like highlighted text.
export function renderKeys(shortcut: Shortcut, terms: readonly string[]): HTMLElement {
  const keys: HTMLSpanElement = element('span', 'help-keys');
  if (shortcut.gesture !== undefined) keys.append(element('span', 'help-key-word', GESTURE_WORDS[shortcut.gesture]));
  shownChords(shortcut).forEach((chord: KeyChord, index: number): void => {
    if (index > 0) keys.append(element('span', 'help-key-word', 'or'));
    keys.append(renderChord(chord, terms));
  });
  return keys;
}

function renderChord(chord: KeyChord, terms: readonly string[]): HTMLElement {
  const group: HTMLSpanElement = element('span', 'help-chord');
  group.append(...chordCaps(chord).map((cap: KeyCap) => renderCap(cap, terms)));
  return group;
}

function renderCap(cap: KeyCap, terms: readonly string[]): HTMLElement {
  const kbd: HTMLElement = element('kbd', `help-kbd${isNamedBy(cap, terms) ? ' is-match' : ''}`, cap.glyph);
  // A bare glyph (⌫, ↩) gets its name on hover.
  if (!cap.glyph.includes(cap.name)) kbd.title = cap.name;
  return kbd;
}

// A keycap lights up when a term is its name or the start of it ("shi" → Shift), not merely a letter inside
// it: "p" marks P, not Up and Space.
function isNamedBy(cap: KeyCap, terms: readonly string[]): boolean {
  const words: readonly string[] = [foldText(cap.glyph), foldText(cap.name)];
  return terms.some((term: string) => words.some((word: string) => word === term || (term.length >= MIN_PREFIX_LENGTH && word.startsWith(term))));
}
