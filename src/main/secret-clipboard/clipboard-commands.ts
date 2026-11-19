import { runCommand } from '../run-command';
import { wlCopy } from '../wl-copy';

// Copies carry this extra MIME type beside the plain-text ones wl-copy offers, so the PC's cliphist watcher
// (~/.config/hypr/scripts/cliphist-store-safe.sh) recognises a secret and keeps it out of the history. wl-copy offers
// one type only, so the KDE password-manager hint cannot ride along, and wl-paste 2.2.1 would not honour it anyway.
export const SECRET_MIME_TYPE: string = 'text/x-orbit-secret';

export function writeSecret(text: string): Promise<void> {
  return wlCopy(text, ['--type', SECRET_MIME_TYPE]);
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
