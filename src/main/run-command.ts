import { execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

export function runCommand(command: string, args: readonly string[], stdin?: string): Promise<string> {
  return new Promise((resolve, reject): void => {
    const child: ChildProcess = execFile(command, args, (error, stdout: string, stderr: string): void => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
    if (stdin !== undefined) child.stdin?.end(stdin);
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}
