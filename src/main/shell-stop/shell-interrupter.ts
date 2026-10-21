import type { LiveShell } from '../../core/chat-radar';
import { isTaskId } from '../../core/shells/chat-shells';
import { isTaskOutputPath } from '../../core/shells/shell-output';
import type { ActionResult } from '../../shared/types';
import { delay } from '../run-command';
import { failure, success } from '../terminal-input';
import { readProcessTable } from './process-table';
import type { ProcessRef } from './shell-processes';
import { selectShellProcesses } from './shell-processes';
import { aliveOf, terminate } from './terminate';

// What interrupting needs from the radar: the shell with its chat's pid, and a note that Orbit ended it.
export interface ShellStopSource {
  liveShell(sessionId: string, taskId: unknown): Promise<LiveShell | null>;
  markShellInterrupted(taskId: string): void;
}

// How long Claude Code gets to notice the exit and write its task notification.
const END_CONFIRM_TIMEOUT_MS: number = 8000;
const END_CONFIRM_POLL_MS: number = 250;
const END_CONFIRM_TIMEOUT_SECONDS: number = END_CONFIRM_TIMEOUT_MS / 1000;
const ALREADY_ENDED: string = 'The command already ended';

// Shells being interrupted; a second click must not start another round of signals.
const inFlight: Set<string> = new Set();

// Ends one background command by signalling its own processes, found through the output file that names its task.
export async function interruptShell(source: ShellStopSource, sessionId: unknown, taskId: unknown): Promise<ActionResult> {
  if (typeof sessionId !== 'string' || !isTaskId(taskId)) return failure('Unknown command');
  if (inFlight.has(taskId)) return failure('This command is already being interrupted');
  inFlight.add(taskId);
  try {
    return await interrupt(source, sessionId, taskId);
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  } finally {
    inFlight.delete(taskId);
  }
}

async function interrupt(source: ShellStopSource, sessionId: string, taskId: string): Promise<ActionResult> {
  const live: LiveShell | null = await source.liveShell(sessionId, taskId);
  if (live === null || live.shell.status !== 'running') return failure(ALREADY_ENDED);
  const outputFile: string | null = live.shell.outputFile;
  if (outputFile === null || !isTaskOutputPath(outputFile, sessionId, taskId)) return failure('Orbit cannot tell which process runs this command');
  const processes: ProcessRef[] = selectShellProcesses(await readProcessTable(live.chatPid), live.chatPid, outputFile);
  if (processes.length === 0) return failure(ALREADY_ENDED);
  await terminate(processes);
  if ((await aliveOf(processes)).length > 0) return failure('The command did not exit, even after SIGKILL');
  source.markShellInterrupted(taskId);
  return (await waitUntilEnded(source, sessionId, taskId))
    ? success('signal')
    : failure(`The command exited, but the chat did not report it within ${END_CONFIRM_TIMEOUT_SECONDS} s`);
}

async function waitUntilEnded(source: ShellStopSource, sessionId: string, taskId: string): Promise<boolean> {
  const deadline: number = Date.now() + END_CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const live: LiveShell | null = await source.liveShell(sessionId, taskId);
    if (live === null || live.shell.status !== 'running') return true;
    await delay(END_CONFIRM_POLL_MS);
  }
  return false;
}
