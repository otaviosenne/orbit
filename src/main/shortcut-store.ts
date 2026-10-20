import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ShortcutDraft } from '../shared/types';
import type { Shortcut } from './shortcut-file';
import { formatShortcutLine, parseShortcuts, shortcutId } from './shortcut-file';

// Next to the SUPER+D launcher's own entries, so a shortcut added here shows up in that grid too.
export const SHORTCUTS_FILE: string = join(homedir(), '.config', 'hypr', 'scripts', 'repo-launcher', 'shortcuts.tsv');

const MISSING_FILE_CODE: string = 'ENOENT';
const LINE_END: string = '\n';

export async function readShortcuts(): Promise<Shortcut[]> {
  return parseShortcuts(await readShortcutsText());
}

export async function appendShortcut(draft: ShortcutDraft): Promise<Shortcut> {
  const text: string = await readShortcutsText();
  const takenIds: string[] = parseShortcuts(text).map((shortcut: Shortcut) => shortcut.id);
  const shortcut: Shortcut = { id: shortcutId(draft.label, takenIds), ...draft };
  // A hand-edited file may lack its last line break, which would glue the new line onto the previous one.
  const lineBreak: string = text === '' || text.endsWith(LINE_END) ? '' : LINE_END;
  await appendFile(SHORTCUTS_FILE, lineBreak + formatShortcutLine(shortcut), 'utf8');
  return shortcut;
}

async function readShortcutsText(): Promise<string> {
  try {
    return await readFile(SHORTCUTS_FILE, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === MISSING_FILE_CODE) return '';
    throw error;
  }
}
