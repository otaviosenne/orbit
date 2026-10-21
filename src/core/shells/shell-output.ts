import { lstat } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { basename, dirname, isAbsolute, normalize } from 'node:path';
import type { ShellOutput } from '../../shared/types';
import { readTail } from '../file-reader';
import type { TailText } from '../file-reader';
import { cleanOutput } from './output-text';

// Enough for the last screenful or two of a build or test run, small enough to send every refresh.
export const SHELL_OUTPUT_BYTES: number = 32 * 1024;

const TASKS_FOLDER: string = 'tasks';
const OUTPUT_SUFFIX: string = '.output';

// The path comes from the transcript, so it is only trusted when it is exactly
// <tmp>/<encoded cwd>/<sessionId>/tasks/<taskId>.output, as Claude Code writes it.
export function isTaskOutputPath(path: string, sessionId: string, taskId: string): boolean {
  if (!isAbsolute(path) || normalize(path) !== path) return false;
  const tasks: string = dirname(path);
  return basename(path) === `${taskId}${OUTPUT_SUFFIX}` && basename(tasks) === TASKS_FOLDER && basename(dirname(tasks)) === sessionId;
}

// A link could point anywhere, so only a plain file is read; null when there is nothing (yet) to show.
export async function readShellOutput(path: string): Promise<ShellOutput | null> {
  const stats: Stats | null = await lstat(path).catch((): null => null);
  if (stats === null || !stats.isFile()) return null;
  const tail: TailText = await readTail(path, SHELL_OUTPUT_BYTES);
  return { text: cleanOutput(tail.text), isTruncated: !tail.reachedStart };
}
