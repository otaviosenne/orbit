import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ActionResult, LauncherEntry } from '../shared/types';
import { launchChatInBackground } from './chat-workspace';
import { toLauncherEntries } from './launcher-entries';
import { buildNewChatCommand } from './new-chat-command';
import { runCommand } from './run-command';
import { readShortcuts } from './shortcut-store';
import { failure } from './terminal-input';

// The same entries as the SUPER+D repo launcher, so both always offer the same projects.
const LIST_SCRIPT: string = join(homedir(), '.config', 'hypr', 'scripts', 'repo-launcher', 'list-entries.sh');

export async function listLaunchers(): Promise<LauncherEntry[]> {
  const [output, shortcuts] = await Promise.all([runCommand(LIST_SCRIPT, []), readShortcuts()]);
  return toLauncherEntries(output, shortcuts);
}

// Takes a name, not a command: the command is always re-read from the launcher list.
export async function openLauncher(name: string): Promise<ActionResult> {
  const entry: LauncherEntry | undefined = (await listLaunchers()).find((candidate: LauncherEntry) => candidate.name === name);
  if (entry === undefined) return failure(`Unknown launcher: ${name}`);
  try {
    await launchChatInBackground(buildNewChatCommand(entry));
    return { ok: true, method: null, error: null };
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}
