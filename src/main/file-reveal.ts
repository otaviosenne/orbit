import { shell } from 'electron';
import { access } from 'node:fs/promises';
import { plainAbsolutePath } from './attachment-path';

// Opens the file manager at a file named in a message. Only shows where it is: nothing is opened or run.
export async function revealFile(path: unknown): Promise<void> {
  const file: string | null = plainAbsolutePath(path);
  if (file === null) return;
  try {
    await access(file);
    shell.showItemInFolder(file);
  } catch {
    // Gone since the message was sent.
  }
}
