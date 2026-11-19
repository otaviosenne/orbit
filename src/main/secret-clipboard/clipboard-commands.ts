import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { runCommand } from '../run-command';

// Copies carry this extra MIME type beside the plain-text ones wl-copy offers, so the PC's cliphist watcher
// (~/.config/hypr/scripts/cliphist-store-safe.sh) recognises a secret and keeps it out of the history. wl-copy offers
// one type only, so the KDE password-manager hint cannot ride along, and wl-paste 2.2.1 would not honour it anyway.
export const SECRET_MIME_TYPE: string = 'text/x-orbit-secret';

// wl-copy talks to the compositor's data-control protocol, so it works while Orbit has no focus (a copy from the
// phone). The secret goes on stdin, never in argv where a process list would show it. Its forked child keeps serving
// the paste and would hold any captured pipe open, so its output is ignored and only the parent's exit is awaited.
export function writeSecret(text: string): Promise<void> {
  return new Promise((resolve, reject): void => {
    const child: ChildProcess = spawn('wl-copy', ['--type', SECRET_MIME_TYPE], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.once('error', reject);
    child.once('exit', (code: number | null): void => (code === 0 ? resolve() : reject(new Error('wl-copy failed'))));
    child.stdin?.end(text);
  });
}

// The secret still on the clipboard, or null once anything else (or nothing) replaced it: asking for the marker
// type fails unless the clipboard holds one of Orbit's copies.
export async function readSecret(): Promise<string | null> {
  try {
    return await runCommand('wl-paste', ['--no-newline', '--type', SECRET_MIME_TYPE]);
  } catch {
    return null;
  }
}

// Clearing adds nothing to cliphist (checked on the PC), so the history keeps the user's own last copy.
export async function clearClipboard(): Promise<void> {
  await runCommand('wl-copy', ['--clear']);
}
