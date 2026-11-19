import { clearClipboard, readSecret, writeSecret } from './clipboard-commands';

// Long enough to switch to the chat and let it paste, short enough that a password does not sit there for the next
// ctrl+v somewhere else.
export const CLEAR_SECRET_AFTER_MS: number = 45_000;

export interface ClipboardCommands {
  write(text: string): Promise<void>;
  read(): Promise<string | null>;
  clear(): Promise<void>;
}

const WAYLAND_CLIPBOARD: ClipboardCommands = { write: writeSecret, read: readSecret, clear: clearClipboard };

// Puts the secret on the PC's clipboard and wipes it after the timeout. Each copy keeps its own timer, which clears
// only its own secret: a later copy of the next field is left alone.
export async function copySecret(text: string, commands: ClipboardCommands = WAYLAND_CLIPBOARD, clearAfterMs: number = CLEAR_SECRET_AFTER_MS): Promise<void> {
  await commands.write(text);
  const timer: NodeJS.Timeout = setTimeout((): void => void clearIfStillThere(text, commands), clearAfterMs);
  // A pending wipe must not keep Orbit's process alive on quit.
  timer.unref();
}

export async function clearIfStillThere(text: string, commands: ClipboardCommands): Promise<void> {
  try {
    if ((await commands.read()) === text) await commands.clear();
  } catch {
    // Nothing more to do: the clipboard already moved on, or the PC has no Wayland session.
  }
}
