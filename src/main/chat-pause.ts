import type { PauseReport, PauseTarget } from '../shared/types';
import { CONTINUE_MESSAGE, PAUSE_MESSAGE } from '../shared/pause-messages';
import { interruptChat } from './chat-interrupt';
import { hasKittySocket } from './kitty-remote';
import { delay } from './run-command';
import { submitToChat } from './terminal-input';
import { findTerminalWindowPid } from './terminal-window';

// Escape and the paste after it both start with the ESC byte; apart in time, the terminal reads them as two keys.
const INTERRUPT_SETTLE_MS: number = 300;

// One chat at a time: each message is typed into a terminal, and two at once would interleave their keystrokes.
export async function pauseChats(targets: readonly PauseTarget[]): Promise<PauseReport> {
  return eachChat(targets.map((target: PauseTarget) => target.pid), (pid: number): Promise<boolean> => pauseOne(pid, interruptsFirst(targets, pid)));
}

export async function continueChats(pids: readonly number[]): Promise<PauseReport> {
  return eachChat(pids, (pid: number): Promise<boolean> => say(pid, CONTINUE_MESSAGE));
}

function interruptsFirst(targets: readonly PauseTarget[], pid: number): boolean {
  return targets.some((target: PauseTarget) => target.pid === pid && target.interrupt);
}

async function pauseOne(pid: number, interrupt: boolean): Promise<boolean> {
  if (!(await hasRemoteControl(pid))) return false;
  if (interrupt) {
    if (!(await interruptChat(pid)).ok) return false;
    await delay(INTERRUPT_SETTLE_MS);
  }
  return say(pid, PAUSE_MESSAGE);
}

// Without kitty's remote control the only way in is typing into the focused window, which a bulk send must never do.
async function say(pid: number, text: string): Promise<boolean> {
  if (!(await hasRemoteControl(pid))) return false;
  return (await submitToChat(pid, text, 'message')).ok;
}

async function hasRemoteControl(pid: number): Promise<boolean> {
  const windowPid: number | null = await findTerminalWindowPid(pid);
  return windowPid !== null && (await hasKittySocket(windowPid));
}

async function eachChat(pids: readonly number[], act: (pid: number) => Promise<boolean>): Promise<PauseReport> {
  const reached: number[] = [];
  const skipped: number[] = [];
  for (const pid of pids) (await act(pid) ? reached : skipped).push(pid);
  return { reached, skipped };
}
