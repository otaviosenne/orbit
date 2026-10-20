import type { ShellSnapshot } from '../../shared/types';
import { AGENT_READ_BYTES } from '../config';
import { FileMemo } from '../file-memo';
import { readTail } from '../file-reader';
import { isConversationLine, parseRecords } from '../jsonl';
import type { LineFilter } from '../jsonl';
import { extractRunningShells } from './background-shells';

// Only lines that can start or end a background shell get parsed; the rest of a long transcript is skipped cheaply.
const SHELL_MARKERS: readonly string[] = ['"name":"Bash"', 'backgroundTaskId', '"name":"TaskStop"', '"task_id"', 'task-notification'];
const QUEUE_LINE: string = '"type":"queue-operation"';

const isShellLine: LineFilter = (line: string): boolean =>
  (isConversationLine(line) || line.includes(QUEUE_LINE)) && SHELL_MARKERS.some((marker: string) => line.includes(marker));

export class ShellReader {
  private readonly shells: FileMemo<ShellSnapshot[]> = new FileMemo();

  // A chat process that restarted took its shells with it, so only those started since count.
  async read(transcriptPath: string, processStartedAt: number): Promise<ShellSnapshot[]> {
    try {
      const all: ShellSnapshot[] = await this.shells.get(transcriptPath, async (): Promise<ShellSnapshot[]> =>
        extractRunningShells(parseRecords((await readTail(transcriptPath, AGENT_READ_BYTES)).text, isShellLine)),
      );
      return all.filter((shell: ShellSnapshot) => shell.startedAt >= processStartedAt);
    } catch {
      return [];
    }
  }
}
