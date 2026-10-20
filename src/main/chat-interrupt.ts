import type { ActionResult } from '../shared/types';
import { hasKittySocket, kittySocketPath } from './kitty-remote';
import { runCommand } from './run-command';
import { failure, success } from './terminal-input';
import { findTerminalWindowPid } from './terminal-window';

// Escape is what stops Claude Code mid-turn in its own terminal; the chat keeps everything up to that point.
const INTERRUPT_KEY: string = 'escape';

export async function interruptChat(chatPid: number): Promise<ActionResult> {
  const windowPid: number | null = await findTerminalWindowPid(chatPid);
  if (windowPid === null) return failure('Terminal window not found');
  if (!(await hasKittySocket(windowPid))) return failure('This chat was not opened with kitty remote control');
  try {
    await runCommand('kitty', ['@', '--to', `unix:${kittySocketPath(windowPid)}`, 'send-key', INTERRUPT_KEY]);
    return success('socket');
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}
