import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { wlCopy } from '../wl-copy';
import { parseTypeList } from './clipboard-types';

// A list of MIME types is a few hundred bytes; anything longer is not one.
const LIST_TYPES_LIMIT_BYTES: number = 64 * 1024;

export type BoundedRead = { readonly kind: 'read'; readonly bytes: Buffer } | { readonly kind: 'too-large' } | { readonly kind: 'failed' };

// The three wl-clipboard calls the shared clipboard needs, apart so tests can stand in for the desktop.
export interface WaylandCommands {
  // The MIME types on offer; empty when nothing is copied (wl-paste then exits non-zero).
  listTypes(): Promise<string[]>;
  readType(type: string, maxBytes: number): Promise<BoundedRead>;
  copy(text: string): Promise<void>;
}

export const WL_CLIPBOARD: WaylandCommands = {
  listTypes: async (): Promise<string[]> => {
    const listed: BoundedRead = await runBounded(['--list-types'], LIST_TYPES_LIMIT_BYTES);
    return listed.kind === 'read' ? parseTypeList(listed.bytes.toString('utf8')) : [];
  },
  readType: (type: string, maxBytes: number): Promise<BoundedRead> => runBounded(['--no-newline', '--type', type], maxBytes),
  copy: (text: string): Promise<void> => wlCopy(text),
};

// wl-paste stops being read, and is killed, once it passes the limit: a huge copy is never held whole in memory.
function runBounded(args: readonly string[], maxBytes: number): Promise<BoundedRead> {
  return new Promise((resolve: (result: BoundedRead) => void): void => {
    const child: ChildProcess = spawn('wl-paste', [...args], { stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks: Buffer[] = [];
    let size: number = 0;
    let tooLarge: boolean = false;
    child.stdout?.on('data', (chunk: Buffer): void => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        child.kill();
        return;
      }
      chunks.push(chunk);
    });
    child.once('error', (): void => resolve({ kind: 'failed' }));
    child.once('close', (code: number | null): void => {
      if (tooLarge) return resolve({ kind: 'too-large' });
      resolve(code === 0 ? { kind: 'read', bytes: Buffer.concat(chunks) } : { kind: 'failed' });
    });
  });
}
