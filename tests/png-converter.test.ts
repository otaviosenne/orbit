import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { isPng } from '../src/main/shared-clipboard/image-format';
import { convertToPng, ImageConversionError } from '../src/main/shared-clipboard/png-converter';

function hasMagick(): boolean {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Made by ImageMagick itself, so the test needs no fixture file.
function sampleImage(format: string): Buffer {
  return execFileSync('magick', ['-size', '4x4', 'xc:red', `${format}:-`]);
}

describe.skipIf(!hasMagick())('convertToPng', () => {
  it('turns a JPEG and a HEIC into PNG', async () => {
    for (const format of ['jpeg', 'heic']) expect(isPng(await convertToPng(sampleImage(format))), format).toBe(true);
  });

  it('refuses bytes that are no image', async () => {
    await expect(convertToPng(Buffer.from('not an image'))).rejects.toBeInstanceOf(ImageConversionError);
  });
});
