import { AGENT_READ_BYTES } from '../config';
import { FileMemo } from '../file-memo';
import { readTail } from '../file-reader';
import { isConversationLine, parseRecords } from '../jsonl';
import type { LineFilter } from '../jsonl';
import type { ShellRecord } from './background-shells';
import { extractShells } from './background-shells';

// A finished shell stays listed this long, so a quick failure is still there to be read.
export const SHELL_LINGER_MS: number = 5 * 60 * 1000;

// Only lines that can start or end a background shell get parsed; the rest of a long transcript is skipped cheaply.
const SHELL_MARKERS: readonly string[] = ['"name":"Bash"', 'backgroundTaskId', '"name":"TaskStop"', '"task_id"', 'task-notification'];
const QUEUE_LINE: string = '"type":"queue-operation"';

const isShellLine: LineFilter = (line: string): boolean =>
  (isConversationLine(line) || line.includes(QUEUE_LINE)) && SHELL_MARKERS.some((marker: string) => line.includes(marker));

export class ShellReader {
  private readonly shells: FileMemo<ShellRecord[]> = new FileMemo();

  async read(transcriptPath: string, processStartedAt: number, now: number): Promise<ShellRecord[]> {
    try {
      const all: ShellRecord[] = await this.shells.get(transcriptPath, async (): Promise<ShellRecord[]> =>
        extractShells(parseRecords((await readTail(transcriptPath, AGENT_READ_BYTES)).text, isShellLine)),
      );
      return listedShells(all, processStartedAt, now);
    } catch {
      return [];
    }
  }
}

// A chat process that restarted took its shells with it, so only those started since count.
export function listedShells(shells: readonly ShellRecord[], processStartedAt: number, now: number): ShellRecord[] {
  return shells.filter((shell: ShellRecord) => shell.startedAt >= processStartedAt && (shell.endedAt === null || now - shell.endedAt < SHELL_LINGER_MS));
}
