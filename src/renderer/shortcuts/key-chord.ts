// One key plus the modifiers held with it, as KeyboardEvent.key names it (letters in lower case).
export interface KeyChord {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

// The parts of a KeyboardEvent the matching reads, so it can be tested without a DOM.
export interface KeyStroke {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

const LETTER: RegExp = /^[a-z]$/;
const SINGLE_CHARACTER_LENGTH: number = 1;

// Symbols such as ? [ ] , = + already depend on Shift for the character they produce (and on the layout),
// so Shift is ignored for them; letters and named keys need Shift exactly as written, or Caps Lock and
// Shift+N would trigger N.
function ignoresShift(key: string): boolean {
  return key.length === SINGLE_CHARACTER_LENGTH && !LETTER.test(key) && !isDigit(key);
}

function isDigit(key: string): boolean {
  return key >= '0' && key <= '9' && key.length === SINGLE_CHARACTER_LENGTH;
}

function normalizedKey(key: string): string {
  return key.length === SINGLE_CHARACTER_LENGTH ? key.toLowerCase() : key;
}

export function chordMatches(chord: KeyChord, stroke: KeyStroke): boolean {
  if (normalizedKey(stroke.key) !== chord.key) return false;
  if (stroke.ctrlKey !== (chord.ctrl ?? false) || stroke.altKey !== (chord.alt ?? false) || stroke.metaKey) return false;
  return ignoresShift(chord.key) || stroke.shiftKey === (chord.shift ?? false);
}

// Two chords that the same key press would match share this id.
export function chordId(chord: KeyChord): string {
  const shift: boolean = !ignoresShift(chord.key) && (chord.shift ?? false);
  return [chord.ctrl === true ? 'ctrl' : '', chord.alt === true ? 'alt' : '', shift ? 'shift' : '', chord.key].join('+');
}
