import type { Stats } from 'node:fs';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname } from 'node:path';
import { viewableMediaType } from '../shared/attachment-kinds';
import { VIEWER_LIMIT_BYTES } from '../shared/attachment-limits';
import type { AttachmentBlob } from '../shared/types';
import { fileDirectlyIn } from './attachment-path';
import { ATTACHMENTS_DIR } from './attachments';

// Reads a file Orbit saved for a message, for the viewer. Orbit Web can ask too, so the path is held to the
// attachments folder: spelled as a file directly inside it, a regular file there (not a link out of it), of a
// viewable kind, small enough to send whole. Anything else answers null, the same as a file that is gone.
export async function readAttachment(path: unknown): Promise<AttachmentBlob | null> {
  const file: string | null = typeof path === 'string' ? fileDirectlyIn(ATTACHMENTS_DIR, path) : null;
  const mediaType: string | null = file === null ? null : viewableMediaType(file);
  if (file === null || mediaType === null) return null;
  try {
    if (!(await isServableFile(file))) return null;
    return { mediaType, bytes: new Uint8Array(await readFile(file)) };
  } catch {
    return null;
  }
}

// lstat does not follow links, so a link planted in the folder is refused rather than read through.
async function isServableFile(file: string): Promise<boolean> {
  const stats: Stats = await lstat(file);
  if (!stats.isFile() || stats.size > VIEWER_LIMIT_BYTES) return false;
  return (await realpath(dirname(file))) === (await realpath(ATTACHMENTS_DIR));
}
