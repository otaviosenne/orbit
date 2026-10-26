import type { ActionResult } from '../shared/types';
import { launchThroughHyprland } from './hyprland-exec';
import { failure } from './terminal-input';

// Interactive bash because `claude` lives on the user's PATH from ~/.bashrc; the shell stays open to show the result.
const SIGN_IN_COMMAND: string = `kitty bash -ic 'claude auth login; exec bash'`;

// Only opens the terminal: the user finishes the sign-in in the browser, so Orbit never touches a password or token.
export async function openSignIn(): Promise<ActionResult> {
  try {
    await launchThroughHyprland(SIGN_IN_COMMAND);
    return { ok: true, method: null, error: null };
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}
