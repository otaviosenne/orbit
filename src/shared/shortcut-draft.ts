import type { ShortcutDraft } from './types';

// Shortcuts are stored one per line with tab-separated fields, so neither may appear inside a field.
const FORBIDDEN_CHARACTERS: RegExp = /[\t\r\n]/;
const HOME_PREFIX: string = '~/';
const HOME_ALONE: string = '~';
const PATH_SEPARATOR: string = '/';

// Trims every field and fills an empty chat name with the label.
export function normalizeDraft(draft: ShortcutDraft): ShortcutDraft {
  const label: string = draft.label.trim();
  const chatName: string = draft.chatName.trim();
  return { label, chatName: chatName === '' ? label : chatName, folder: draft.folder.trim() };
}

// What is wrong with a normalized draft, or null when it can be saved. The folder itself is checked by
// folderProblem, in the main process, where the disk and the home folder are known.
export function draftProblem(draft: ShortcutDraft, takenLabels: readonly string[]): string | null {
  if (draft.label === '') return 'Give the shortcut a label.';
  if (Object.values(draft).some((field: string) => FORBIDDEN_CHARACTERS.test(field))) return 'Tabs and line breaks are not allowed.';
  if (takenLabels.includes(draft.label)) return `There is already a shortcut called ${draft.label}.`;
  if (draft.folder === '') return 'Choose the folder Claude opens in.';
  return null;
}

// For a folder with ~ already expanded; whether it exists is left to the caller.
export function folderProblem(folder: string): string | null {
  return folder.startsWith(PATH_SEPARATOR) ? null : 'The folder must be a full path, like /home/you/project.';
}

export function isShortcutDraft(value: unknown): value is ShortcutDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft: Record<string, unknown> = value as Record<string, unknown>;
  return typeof draft['label'] === 'string' && typeof draft['chatName'] === 'string' && typeof draft['folder'] === 'string';
}

export function expandHome(folder: string, home: string): string {
  if (folder === HOME_ALONE) return home;
  return folder.startsWith(HOME_PREFIX) ? `${home}${PATH_SEPARATOR}${folder.slice(HOME_PREFIX.length)}` : folder;
}
