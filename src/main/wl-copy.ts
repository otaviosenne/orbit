import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

// wl-copy talks to the compositor's data-control protocol, so it works while Orbit has no focus (a copy from the
// phone). The content goes on stdin, never in argv where a process list would show it. Its forked child keeps serving
// the paste and would hold any captured pipe open, so its output is ignored and only the parent's exit is awaited.
export function wlCopy(content: string | Buffer, args: readonly string[] = []): Promise<void> {
  return new Promise((resolve, reject): void => {
    const child: ChildProcess = spawn('wl-copy', [...args], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.once('error', reject);
    child.once('exit', (code: number | null): void => (code === 0 ? resolve() : reject(new Error('wl-copy failed'))));
    child.stdin?.end(content);
  });
}
