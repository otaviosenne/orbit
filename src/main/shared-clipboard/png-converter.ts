import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { MAX_CONVERTED_PNG_BYTES } from './clipboard-limits';

// A huge HEIC takes ImageMagick a few seconds; one that takes longer is stuck, not slow.
const CONVERSION_TIMEOUT_MS: number = 30_000;
// Only the first frame (a GIF or a live photo has more), turned upright as the iPhone showed it.
const MAGICK_ARGS: readonly string[] = ['-[0]', '-auto-orient', 'png:-'];

export class ImageConversionError extends Error {}

// Decodes any image ImageMagick reads (HEIC, JPEG, WebP, GIF) into PNG, through stdin and stdout only.
export function convertToPng(image: Buffer): Promise<Buffer> {
  return new Promise((resolve: (png: Buffer) => void, reject: (error: Error) => void): void => {
    const child: ChildProcess = spawn('magick', [...MAGICK_ARGS], { stdio: ['pipe', 'pipe', 'ignore'], timeout: CONVERSION_TIMEOUT_MS });
    const chunks: Buffer[] = [];
    let size: number = 0;
    child.stdout?.on('data', (chunk: Buffer): void => {
      size += chunk.length;
      if (size > MAX_CONVERTED_PNG_BYTES) child.kill();
      else chunks.push(chunk);
    });
    child.once('error', (): void => reject(new ImageConversionError('ImageMagick could not run')));
    child.once('close', (code: number | null): void => {
      if (code === 0 && size <= MAX_CONVERTED_PNG_BYTES) resolve(Buffer.concat(chunks));
      else reject(new ImageConversionError('ImageMagick could not read the image'));
    });
    // The child may die before taking all of stdin; that shows up as its exit code, not as a crash here.
    child.stdin?.on('error', (): void => undefined);
    child.stdin?.end(image);
  });
}
