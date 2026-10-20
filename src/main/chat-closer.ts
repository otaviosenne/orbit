import type { ActionResult } from '../shared/types';
import { closeKittyWindowOf } from './kitty-windows';
import { hasKittySocket } from './kitty-remote';
import { runCommand } from './run-command';
import { failure } from './terminal-input';
import { findTerminalWindowPid } from './terminal-window';

// Nothing was typed or pasted, so there is no delivery method to report.
const CLOSED: ActionResult = { ok: true, method: null, error: null };

// Closes the terminal window a chat runs in, as clicking the window's own close button would.
export async function closeChat(chatPid: number): Promise<ActionResult> {
  const windowPid: number | null = await findTerminalWindowPid(chatPid);
  if (windowPid === null) return failure('Terminal window not found');
  try {
    if (await hasKittySocket(windowPid)) {
      await closeKittyWindowOf(windowPid, chatPid);
      return CLOSED;
    }
    // Without the socket Hyprland asks kitty to close, which may show kitty's own confirmation.
    await runCommand('hyprctl', ['dispatch', 'closewindow', `pid:${windowPid}`]);
    return CLOSED;
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}
