import type { ActionResult, SettingResult, SwitchConfirmation } from '../../shared/types';
import { hasKittySocket } from '../kitty-remote';
import { PickerTerminal } from '../questions/picker-terminal';
import { delay } from '../run-command';
import { failure, success } from '../terminal-input';
import { findTerminalWindowPid } from '../terminal-window';
import { parseSwitchDialog } from './switch-dialog';

// Claude Code draws the dialog a moment after the command; a change it accepts outright shows none.
const DIALOG_WAIT_MS: number = 1500;
const DIALOG_POLL_MS: number = 150;
// The dialog's options, picked by their number.
const YES_DIGIT: string = '1';
const NO_DIGIT: string = '2';

// A sent /model or /effort, with the dialog it opened if Claude Code asks first; without the kitty socket the screen
// cannot be read, so the change is reported as sent.
export async function withSwitchDialog(pid: number, sent: ActionResult): Promise<SettingResult> {
  if (!sent.ok) return { ...sent, confirm: null };
  const terminal: PickerTerminal | null = await terminalOf(pid);
  return { ...sent, confirm: terminal === null ? null : await waitForDialog(terminal) };
}

// The answer is only typed while the dialog is still on screen, so a stray digit never lands in the prompt.
export async function answerSwitchDialog(pid: number, accept: boolean): Promise<ActionResult> {
  const terminal: PickerTerminal | null = await terminalOf(pid);
  if (terminal === null) return failure('The chat window cannot be reached');
  if (parseSwitchDialog(await terminal.plainScreen()) === null) return failure('The confirmation is no longer showing in the chat');
  await terminal.run([{ kind: 'text', text: accept ? YES_DIGIT : NO_DIGIT }]);
  return success('socket');
}

async function waitForDialog(terminal: PickerTerminal): Promise<SwitchConfirmation | null> {
  const deadline: number = Date.now() + DIALOG_WAIT_MS;
  for (;;) {
    const dialog: SwitchConfirmation | null = parseSwitchDialog(await terminal.plainScreen());
    if (dialog !== null || Date.now() >= deadline) return dialog;
    await delay(DIALOG_POLL_MS);
  }
}

async function terminalOf(pid: number): Promise<PickerTerminal | null> {
  const windowPid: number | null = await findTerminalWindowPid(pid);
  return windowPid !== null && (await hasKittySocket(windowPid)) ? new PickerTerminal(windowPid) : null;
}
