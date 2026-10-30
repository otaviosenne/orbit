import { execFile, spawn } from 'node:child_process';
import type { Command } from './desktop-commands';

// How the Computer page reaches the machine, kept behind an interface so its logic is tested without touching it.
export interface CommandRunner {
  // What the command printed, or null when it failed, timed out or does not exist.
  output(command: Command, timeoutMs: number): Promise<string | null>;
  // Starts a command that may outlive the request (a window, a power action) and does not wait for it.
  launch(command: Command): void;
}

// Never through a shell: arguments are passed as they are, so nothing in them is ever run as a command.
export const desktopRunner: CommandRunner = {
  output: (command: Command, timeoutMs: number): Promise<string | null> =>
    new Promise((resolve: (text: string | null) => void): void => {
      execFile(command.file, [...command.args], { timeout: timeoutMs }, (error: Error | null, stdout: string): void => {
        resolve(error === null ? stdout : null);
      });
    }),
  launch: (command: Command): void => {
    const child = spawn(command.file, [...command.args], { detached: true, stdio: 'ignore' });
    child.on('error', (): void => undefined);
    child.unref();
  },
};
