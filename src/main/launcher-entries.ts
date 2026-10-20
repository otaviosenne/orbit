import type { LauncherEntry } from '../shared/types';
import type { Shortcut } from './shortcut-file';

const FIELD_SEPARATOR: string = '\t';
const LINE_SEPARATOR: string = '\n';

// Reads list-entries.sh output ("name<TAB>command" lines) and adds each entry's chat name and, for shortcuts, its folder.
// A launcher from ~/.bashrc has no chat name of its own, so its chat is named after its label.
export function toLauncherEntries(listOutput: string, shortcuts: readonly Shortcut[]): LauncherEntry[] {
  return listOutput
    .split(LINE_SEPARATOR)
    .map((line: string) => line.split(FIELD_SEPARATOR))
    .filter((fields: string[]) => fields.length >= 2 && fields[0] !== '')
    .map(([name, command]: string[]): LauncherEntry => withShortcut(name ?? '', command ?? '', shortcuts));
}

function withShortcut(name: string, command: string, shortcuts: readonly Shortcut[]): LauncherEntry {
  const shortcut: Shortcut | undefined = shortcuts.find((candidate: Shortcut) => candidate.label === name);
  return { name, command, chatName: shortcut?.chatName ?? name, folder: shortcut?.folder ?? null };
}
