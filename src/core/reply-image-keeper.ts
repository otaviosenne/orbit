import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';
import { imageMediaTypeOf } from '../shared/attachment-kinds';
import { VIEWER_LIMIT_BYTES } from '../shared/attachment-limits';

// Chats mostly show pictures saved in their scratchpad under /tmp, which a reboot wipes; a copy here keeps the reply's
// picture showing afterwards. Not under ~/.cache, which cleaners treat as disposable.
export const KEPT_REPLY_IMAGES_DIR: string = join(homedir(), '.local', 'share', 'orbit', 'reply-images');
// Past chats can be reopened long after, so copies live far longer than pasted attachments; the cap only stops
// years of screenshots from piling up.
const KEEP_MS: number = 365 * 24 * 60 * 60 * 1000;
const HOME_PREFIX: string = '~/';
const DRAFT_SUFFIX: string = '.part';

export function resolveReplyImagePath(path: string): string {
  return path.startsWith(HOME_PREFIX) ? join(homedir(), path.slice(HOME_PREFIX.length)) : path;
}

// One copy per path the replies named: a file rewritten in place (a screenshot taken again) refreshes it.
export function keptCopyOf(path: string, directory: string = KEPT_REPLY_IMAGES_DIR): string {
  const file: string = resolveReplyImagePath(path);
  const name: string = createHash('sha256').update(file).digest('hex');
  return join(directory, `${name}${extname(file).toLowerCase()}`);
}

// Copies the picture unless the copy is already as new as the file; a missing or unreadable file is left alone.
export async function keepReplyImage(path: string, directory: string = KEPT_REPLY_IMAGES_DIR): Promise<void> {
  const file: string = resolveReplyImagePath(path);
  if (imageMediaTypeOf(file) === null) return;
  try {
    const source: Stats = await lstat(file);
    if (!source.isFile() || source.size > VIEWER_LIMIT_BYTES) return;
    const copy: string = keptCopyOf(file, directory);
    if (await isAsNewAs(copy, source)) return;
    await mkdir(directory, { recursive: true });
    // Written aside first, so the viewer never reads a half-copied picture.
    await copyFile(file, `${copy}${DRAFT_SUFFIX}`);
    await rename(`${copy}${DRAFT_SUFFIX}`, copy);
  } catch {
    // The picture vanished meanwhile, or the disk refused: the original still shows while it exists.
  }
}

export async function keepReplyImages(paths: Iterable<string>, directory: string = KEPT_REPLY_IMAGES_DIR): Promise<void> {
  for (const path of new Set(paths)) await keepReplyImage(path, directory);
}

async function isAsNewAs(copy: string, source: Stats): Promise<boolean> {
  try {
    return (await stat(copy)).mtimeMs >= source.mtimeMs;
  } catch {
    return false;
  }
}

export async function pruneOldReplyImages(now: number, directory: string = KEPT_REPLY_IMAGES_DIR): Promise<void> {
  try {
    for (const file of await readdir(directory)) {
      const path: string = join(directory, file);
      if (now - (await stat(path)).mtimeMs > KEEP_MS) await rm(path, { force: true });
    }
  } catch {
    // Nothing kept yet.
  }
}
