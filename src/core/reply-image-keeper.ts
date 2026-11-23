import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, rename, rm, stat, utimes } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';
import { imageMediaTypeOf } from '../shared/attachment-kinds';
import { VIEWER_LIMIT_BYTES } from '../shared/attachment-limits';

// Chats mostly show pictures saved in their scratchpad under /tmp, which a reboot wipes; a copy here keeps the reply's
// picture showing afterwards. Not under ~/.cache, which cleaners treat as disposable.
export const KEPT_REPLY_IMAGES_DIR: string = join(homedir(), '.local', 'share', 'orbit', 'reply-images');
// A copy's time is renewed whenever its chat is read, so this drops only the pictures of chats nobody opened for a
// week, sparing the disk; a chat opened later still shows them while their file exists.
const KEEP_MS: number = 7 * 24 * 60 * 60 * 1000;
const HOME_PREFIX: string = '~/';
const DRAFT_SUFFIX: string = '.part';
const MS_PER_SECOND: number = 1000;

export function resolveReplyImagePath(path: string): string {
  return path.startsWith(HOME_PREFIX) ? join(homedir(), path.slice(HOME_PREFIX.length)) : path;
}

// One copy per path the replies named: a file rewritten in place (a screenshot taken again) refreshes it.
export function keptCopyOf(path: string, directory: string = KEPT_REPLY_IMAGES_DIR): string {
  const file: string = resolveReplyImagePath(path);
  const name: string = createHash('sha256').update(file).digest('hex');
  return join(directory, `${name}${extname(file).toLowerCase()}`);
}

// Copies the picture unless the copy is already as new as the file; otherwise marks the copy as just seen, so the
// pruning spares it (also once the file itself is gone).
export async function keepReplyImage(path: string, directory: string = KEPT_REPLY_IMAGES_DIR, now: number = Date.now()): Promise<void> {
  const file: string = resolveReplyImagePath(path);
  if (imageMediaTypeOf(file) === null) return;
  const copy: string = keptCopyOf(file, directory);
  const source: Stats | null = await imageFileStats(file);
  if (source === null || (await isAsNewAs(copy, source))) return markSeen(copy, now);
  try {
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

async function imageFileStats(file: string): Promise<Stats | null> {
  try {
    const stats: Stats = await lstat(file);
    return stats.isFile() && stats.size <= VIEWER_LIMIT_BYTES ? stats : null;
  } catch {
    return null;
  }
}

async function markSeen(copy: string, now: number): Promise<void> {
  const seconds: number = now / MS_PER_SECOND;
  try {
    await utimes(copy, seconds, seconds);
  } catch {
    // No copy yet: nothing to spare.
  }
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
