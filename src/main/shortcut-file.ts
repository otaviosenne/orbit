import type { ShortcutDraft } from '../shared/types';

// One line of shortcuts.tsv; the id is what the SUPER+D grid passes to start-shortcut.sh.
export interface Shortcut extends ShortcutDraft {
  readonly id: string;
}

const FIELD_SEPARATOR: string = '\t';
const LINE_SEPARATOR: string = '\n';
const COMMENT_PREFIX: string = '#';
const FIELD_COUNT: number = 4;
const FALLBACK_ID: string = 'shortcut';
// wlogout splits actions on spaces and the id ends up in one, so it keeps only characters no shell treats specially.
const UNSAFE_ID_CHARACTERS: RegExp = /[^a-z0-9]+/g;
const EDGE_DASHES: RegExp = /^-+|-+$/g;
const FIRST_DUPLICATE_SUFFIX: number = 2;

export function parseShortcuts(text: string): Shortcut[] {
  return text
    .split(LINE_SEPARATOR)
    .filter((line: string) => line.trim() !== '' && !line.startsWith(COMMENT_PREFIX))
    .map((line: string) => line.split(FIELD_SEPARATOR))
    .filter((fields: string[]) => fields.length >= FIELD_COUNT)
    .map(([id, label, chatName, folder]: string[]): Shortcut => ({ id: id ?? '', label: label ?? '', chatName: chatName ?? '', folder: folder ?? '' }));
}

export function formatShortcutLine(shortcut: Shortcut): string {
  return [shortcut.id, shortcut.label, shortcut.chatName, shortcut.folder].join(FIELD_SEPARATOR) + LINE_SEPARATOR;
}

// A readable id from the label ("Claude acme" → claude-acme), numbered when another shortcut already has it.
export function shortcutId(label: string, takenIds: readonly string[]): string {
  const base: string = label.toLowerCase().replace(UNSAFE_ID_CHARACTERS, '-').replace(EDGE_DASHES, '') || FALLBACK_ID;
  let candidate: string = base;
  for (let suffix: number = FIRST_DUPLICATE_SUFFIX; takenIds.includes(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  return candidate;
}
