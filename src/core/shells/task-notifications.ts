import type { ShellStatus } from '../../shared/types';

// What one <task-notification> block says about the task it names.
export interface TaskEnd {
  readonly taskId: string;
  readonly status: ShellStatus;
  readonly exitCode: number | null;
  readonly outputFile: string | null;
}

const BLOCK: RegExp = /<task-notification>([\s\S]*?)<\/task-notification>/g;
const OPEN_TAG: string = '<task-notification>';
// Claude Code's word for a task ended through TaskStop; Orbit shows it like any other kill.
const STATUSES: Readonly<Record<string, ShellStatus>> = { completed: 'completed', failed: 'failed', killed: 'killed', stopped: 'killed' };
const EXIT_CODE: RegExp = /exit code (\d+)/;

// Each block is read on its own, so one block's summary never lends its exit code to another's status.
export function parseTaskEnds(text: string): TaskEnd[] {
  if (!text.includes(OPEN_TAG)) return [];
  return [...text.matchAll(BLOCK)].map((match: RegExpMatchArray) => parseBlock(match[1] ?? '')).filter((end: TaskEnd | null): end is TaskEnd => end !== null);
}

function parseBlock(body: string): TaskEnd | null {
  const taskId: string | null = tag(body, 'task-id');
  const status: ShellStatus | undefined = STATUSES[tag(body, 'status') ?? ''];
  if (taskId === null || status === undefined) return null;
  const exitCode: string | undefined = EXIT_CODE.exec(tag(body, 'summary') ?? '')?.[1];
  return { taskId, status, exitCode: exitCode === undefined ? null : Number(exitCode), outputFile: tag(body, 'output-file') };
}

function tag(body: string, name: string): string | null {
  const match: RegExpExecArray | null = new RegExp(`<${name}>([^<]*)</${name}>`).exec(body);
  const value: string | undefined = match?.[1]?.trim();
  return value === undefined || value.length === 0 ? null : value;
}
