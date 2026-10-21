import type { ShellOutput, ShellSnapshot } from '../../shared/types';
import type { ShellRecord } from './background-shells';
import { isTaskOutputPath, readShellOutput } from './shell-output';
import { ShellReader } from './shell-reader';

// Claude Code ids are short lowercase alphanumerics; anything else from the renderer is refused.
const TASK_ID: RegExp = /^[a-z0-9]{1,32}$/;
// Interrupts are only relabelled while their shell is listed, so a bounded memory of recent ones is enough.
const MAX_REMEMBERED_INTERRUPTS: number = 200;

// The chats' background shells for the radar: listing, one shell's output, and the ones Orbit interrupted.
export class ChatShells {
  private readonly reader: ShellReader = new ShellReader();
  private readonly interrupted: string[] = [];

  async list(transcriptPath: string, processStartedAt: number, now: number): Promise<ShellSnapshot[]> {
    return (await this.reader.read(transcriptPath, processStartedAt, now)).map((shell: ShellRecord) => this.toSnapshot(shell));
  }

  async find(transcriptPath: string, processStartedAt: number, taskId: unknown): Promise<ShellRecord | null> {
    if (!isTaskId(taskId)) return null;
    const shells: ShellRecord[] = await this.reader.read(transcriptPath, processStartedAt, Date.now());
    return shells.find((shell: ShellRecord) => shell.id === taskId) ?? null;
  }

  async output(transcriptPath: string, processStartedAt: number, sessionId: string, taskId: unknown): Promise<ShellOutput | null> {
    const shell: ShellRecord | null = await this.find(transcriptPath, processStartedAt, taskId);
    if (shell?.outputFile == null || !isTaskOutputPath(shell.outputFile, sessionId, shell.id)) return null;
    return readShellOutput(shell.outputFile);
  }

  // Claude Code records a shell killed from outside as failed with an exit code; Orbit knows better for its own.
  markInterrupted(taskId: string): void {
    this.interrupted.push(taskId);
    if (this.interrupted.length > MAX_REMEMBERED_INTERRUPTS) this.interrupted.shift();
  }

  private toSnapshot(shell: ShellRecord): ShellSnapshot {
    const { outputFile: _outputFile, ...snapshot } = shell;
    const wasInterrupted: boolean = shell.status !== 'running' && this.interrupted.includes(shell.id);
    return wasInterrupted ? { ...snapshot, status: 'killed' } : snapshot;
  }
}

export function isTaskId(value: unknown): value is string {
  return typeof value === 'string' && TASK_ID.test(value);
}
