import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AttachmentUpload } from '../shared/types';

// Claude Code reads the file when its path is pasted; it is kept a while in case the turn is retried.
const ATTACHMENTS_DIR: string = join(homedir(), '.cache', 'orbit', 'attachments');
const KEEP_MS: number = 7 * 24 * 60 * 60 * 1000;
const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
const FALLBACK_EXTENSION: string = 'png';

// Writes the images to disk and returns their paths, in the order they were attached.
export async function saveAttachments(uploads: readonly AttachmentUpload[]): Promise<string[]> {
  if (uploads.length === 0) return [];
  await mkdir(ATTACHMENTS_DIR, { recursive: true });
  return Promise.all(
    uploads.map(async (upload: AttachmentUpload): Promise<string> => {
      const path: string = join(ATTACHMENTS_DIR, `${randomUUID()}.${EXTENSIONS[upload.mediaType] ?? FALLBACK_EXTENSION}`);
      await writeFile(path, upload.bytes);
      return path;
    }),
  );
}

export async function pruneOldAttachments(now: number): Promise<void> {
  try {
    for (const file of await readdir(ATTACHMENTS_DIR)) {
      const path: string = join(ATTACHMENTS_DIR, file);
      if (now - (await stat(path)).mtimeMs > KEEP_MS) await rm(path, { force: true });
    }
  } catch {
    // Nothing saved yet.
  }
}
