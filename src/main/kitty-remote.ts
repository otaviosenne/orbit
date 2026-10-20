import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { PasteStep } from './paste-plan';
import { pastePlan } from './paste-plan';
import { delay, runCommand } from './run-command';

// Escapes in send-text arguments are interpreted by kitty; text read from stdin is sent verbatim.
const CLEAR_LINE: string = '\\x15';
const ENTER: string = '\\r';

export interface KittySendOptions {
  readonly asPaste: boolean;
  // Image files pasted where the text's [Image #N] markers are; Claude Code turns each pasted path into its own marker.
  readonly attachments: readonly string[];
}

// Matches `listen_on unix:${XDG_RUNTIME_DIR}/kitty-{kitty_pid}` in kitty.conf.
export function kittySocketPath(kittyPid: number): string {
  const runtimeDir: string = process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${process.getuid?.() ?? ''}`;
  return join(runtimeDir, `kitty-${kittyPid}`);
}

export async function hasKittySocket(kittyPid: number): Promise<boolean> {
  try {
    await access(kittySocketPath(kittyPid));
    return true;
  } catch {
    return false;
  }
}

export async function submitThroughKitty(kittyPid: number, text: string, options: KittySendOptions): Promise<void> {
  const target: string[] = ['@', '--to', `unix:${kittySocketPath(kittyPid)}`, 'send-text'];
  await runCommand('kitty', [...target, CLEAR_LINE]);
  const steps: PasteStep[] = pastePlan(text, options.attachments, options.asPaste);
  for (const step of steps) {
    await runCommand('kitty', [...target, '--stdin', ...(step.asPaste ? ['--bracketed-paste=enable'] : [])], step.text);
    await delay(step.settleMs);
  }
  await runCommand('kitty', [...target, ENTER]);
}
