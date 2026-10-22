import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pastedImageExtension } from '../shared/attachment-kinds';
import type { AttachmentUpload } from '../shared/types';
import { sanitizedFileName, taggedFileName } from './attachment-names';

// Claude Code reads the file when its path is pasted; it is kept a while in case the turn is retried.
export const ATTACHMENTS_DIR: string = join(homedir(), '.cache', 'orbit', 'attachments');
const KEEP_MS: number = 7 * 24 * 60 * 60 * 1000;
// A name taken by an earlier file gets a short random tag; a few tries rule out a clash with another tag too.
const NAME_TAG_BYTES: number = 3;
const NAME_ATTEMPTS: number = 4;
const ALREADY_EXISTS: string = 'EEXIST';
const CREATE_NEW: string = 'wx';

// An image goes to Claude Code as a pasted path it turns into [Image #N]; any other file as its plain path.
export interface SavedAttachment {
  readonly path: string;
  readonly kind: 'image' | 'file';
}

// Writes the attachments to disk and returns their paths, in the order they were attached.
export async function saveAttachments(uploads: readonly AttachmentUpload[]): Promise<SavedAttachment[]> {
  if (uploads.length === 0) return [];
  await mkdir(ATTACHMENTS_DIR, { recursive: true });
  return Promise.all(uploads.map(saveAttachment));
}

function saveAttachment(upload: AttachmentUpload): Promise<SavedAttachment> {
  const imageExtension: string | null = pastedImageExtension(upload.name, upload.mediaType);
  return imageExtension === null ? saveFile(upload) : saveImage(upload, imageExtension);
}

async function saveImage(upload: AttachmentUpload, extension: string): Promise<SavedAttachment> {
  const path: string = join(ATTACHMENTS_DIR, `${randomUUID()}.${extension}`);
  await writeFile(path, upload.bytes);
  return { path, kind: 'image' };
}

// Keeps the file's own name, so Claude (and the user reading the message) can tell what it is.
async function saveFile(upload: AttachmentUpload): Promise<SavedAttachment> {
  const name: string = sanitizedFileName(upload.name);
  for (let attempt: number = 0; attempt < NAME_ATTEMPTS; attempt++) {
    const path: string = join(ATTACHMENTS_DIR, attempt === 0 ? name : taggedFileName(name, randomBytes(NAME_TAG_BYTES).toString('hex')));
    if (await writeNew(path, upload.bytes)) return { path, kind: 'file' };
  }
  throw new Error(`Could not save ${name}`);
}

// Never overwrites: an older attachment with the same name may still be read by its chat.
async function writeNew(path: string, bytes: Uint8Array): Promise<boolean> {
  try {
    await writeFile(path, bytes, { flag: CREATE_NEW });
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === ALREADY_EXISTS) return false;
    throw error;
  }
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
