import type { Stats } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { imageMediaTypeOf } from '../shared/attachment-kinds';
import { VIEWER_LIMIT_BYTES } from '../shared/attachment-limits';
import type { ImageBlob } from './transcript-extractor';

const HOME_PREFIX: string = '~/';

// Reads a picture a chat's reply pointed at. Orbit Web can ask too, but only for a path that reply named (the key
// is checked against the transcript first), and only a regular image file small enough to send whole.
export async function readReplyImage(path: string): Promise<ImageBlob | null> {
  const file: string = path.startsWith(HOME_PREFIX) ? join(homedir(), path.slice(HOME_PREFIX.length)) : path;
  const mediaType: string | null = imageMediaTypeOf(file);
  if (mediaType === null) return null;
  try {
    const stats: Stats = await lstat(file);
    if (!stats.isFile() || stats.size > VIEWER_LIMIT_BYTES) return null;
    return { mediaType, data: (await readFile(file)).toString('base64') };
  } catch {
    return null;
  }
}
