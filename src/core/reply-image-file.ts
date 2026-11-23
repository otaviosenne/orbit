import type { Stats } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import { imageMediaTypeOf } from '../shared/attachment-kinds';
import { VIEWER_LIMIT_BYTES } from '../shared/attachment-limits';
import { KEPT_REPLY_IMAGES_DIR, keptCopyOf, resolveReplyImagePath } from './reply-image-keeper';
import type { ImageBlob } from './transcript-extractor';

// Reads a picture a chat's reply pointed at, or Orbit's copy of it once the file is gone (a reboot clears /tmp).
// Orbit Web can ask too, but only for a path that reply named (the key is checked against the transcript first), and
// only a regular image file small enough to send whole.
export async function readReplyImage(path: string, keptDirectory: string = KEPT_REPLY_IMAGES_DIR): Promise<ImageBlob | null> {
  const file: string = resolveReplyImagePath(path);
  const mediaType: string | null = imageMediaTypeOf(file);
  if (mediaType === null) return null;
  const bytes: Buffer | null = (await readImageFile(file)) ?? (await readImageFile(keptCopyOf(file, keptDirectory)));
  return bytes === null ? null : { mediaType, data: bytes.toString('base64') };
}

async function readImageFile(file: string): Promise<Buffer | null> {
  try {
    const stats: Stats = await lstat(file);
    if (!stats.isFile() || stats.size > VIEWER_LIMIT_BYTES) return null;
    return await readFile(file);
  } catch {
    return null;
  }
}
