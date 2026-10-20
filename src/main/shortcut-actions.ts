import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { draftProblem, expandHome, folderProblem, isShortcutDraft, normalizeDraft } from '../shared/shortcut-draft';
import type { ActionResult, LauncherEntry, ShortcutDraft } from '../shared/types';
import { listLaunchers } from './launcher';
import { appendShortcut } from './shortcut-store';
import { failure } from './terminal-input';

// Saves a shortcut from the New chat form after checking it again here, where the folder can be looked at.
export async function addShortcut(input: unknown): Promise<ActionResult> {
  if (!isShortcutDraft(input)) return failure('Not a shortcut');
  const normalized: ShortcutDraft = normalizeDraft(input);
  const draft: ShortcutDraft = { ...normalized, folder: expandHome(normalized.folder, homedir()) };
  const takenLabels: string[] = (await listLaunchers()).map((entry: LauncherEntry) => entry.name);
  const problem: string | null = draftProblem(draft, takenLabels) ?? folderProblem(draft.folder);
  if (problem !== null) return failure(problem);
  if (!(await isFolder(draft.folder))) return failure(`There is no folder at ${draft.folder}.`);
  try {
    await appendShortcut(draft);
    return { ok: true, method: null, error: null };
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}

async function isFolder(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
