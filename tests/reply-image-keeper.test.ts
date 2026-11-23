import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { keepReplyImage, keptCopyOf, pruneOldReplyImages } from '../src/core/reply-image-keeper';
import { readReplyImage } from '../src/core/reply-image-file';
import type { ImageBlob } from '../src/core/transcript-extractor';

const DAY_MS: number = 24 * 60 * 60 * 1000;
let scratch: string;
let kept: string;

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'reply-images-'));
  kept = join(scratch, 'kept');
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

function decoded(blob: ImageBlob | null): string | null {
  return blob === null ? null : Buffer.from(blob.data, 'base64').toString();
}

describe('kept reply images', () => {
  it('still shows a reply picture after its file is gone', async () => {
    const picture: string = join(scratch, 'shot.png');
    await writeFile(picture, 'first');
    await keepReplyImage(picture, kept);
    await rm(picture);
    const blob: ImageBlob | null = await readReplyImage(picture, kept);
    expect(blob?.mediaType).toBe('image/png');
    expect(decoded(blob)).toBe('first');
  });

  it('refreshes the copy when the picture is taken again under the same name', async () => {
    const picture: string = join(scratch, 'shot.png');
    await writeFile(picture, 'first');
    await keepReplyImage(picture, kept);
    await writeFile(picture, 'second');
    const later: Date = new Date(Date.now() + DAY_MS);
    await utimes(picture, later, later);
    await keepReplyImage(picture, kept);
    await rm(picture);
    expect(decoded(await readReplyImage(picture, kept))).toBe('second');
  });

  it('ignores files that are not images and paths that never existed', async () => {
    const notes: string = join(scratch, 'notes.txt');
    await writeFile(notes, 'text');
    await keepReplyImage(notes, kept);
    await keepReplyImage(join(scratch, 'missing.png'), kept);
    expect(await readReplyImage(join(scratch, 'missing.png'), kept)).toBeNull();
  });

  it('prunes copies nobody refreshed for a long time', async () => {
    const picture: string = join(scratch, 'shot.png');
    await writeFile(picture, 'first');
    await keepReplyImage(picture, kept);
    await rm(picture);
    await pruneOldReplyImages(Date.now() + 400 * DAY_MS, kept);
    expect(await readReplyImage(picture, kept)).toBeNull();
    expect(keptCopyOf(picture, kept).endsWith('.png')).toBe(true);
  });
});
