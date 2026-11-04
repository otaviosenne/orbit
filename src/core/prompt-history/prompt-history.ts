import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAUDE_DIR } from '../config';
import { FileMemo } from '../file-memo';
import { readTail } from '../file-reader';
import type { TailText } from '../file-reader';
import { listLiveSessions } from '../session-registry';
import type { SessionRecord } from '../session-registry';
import type { HistoryEntry } from './history-entries';
import { expandPastes, parseHistory, promptsOf } from './history-entries';

const HISTORY_FILE: string = join(CLAUDE_DIR, 'history.jsonl');
const PASTE_CACHE_DIR: string = join(CLAUDE_DIR, 'paste-cache');
// The file holds every prompt ever typed; its end holds well over a hundred of any folder in use.
const HISTORY_READ_BYTES: number = 4 * 1024 * 1024;
// A paste's hash names a file in the cache; anything else could climb out of the folder.
const PASTE_HASH: RegExp = /^[0-9a-f]+$/;

// The prompts typed in a folder, oldest first, as Up and Down walk them in a chat window there.
export class PromptHistory {
  private readonly memo: FileMemo<HistoryEntry[]> = new FileMemo();

  constructor(private readonly file: string = HISTORY_FILE, private readonly pasteDir: string = PASTE_CACHE_DIR) {}

  // An open chat's history is its folder's; a closed chat has none to send to.
  async promptsOfChat(sessionId: string): Promise<string[]> {
    const chat: SessionRecord | undefined = (await listLiveSessions()).find((session: SessionRecord) => session.sessionId === sessionId);
    return chat === undefined ? [] : this.prompts(chat.cwd);
  }

  async prompts(project: string): Promise<string[]> {
    try {
      const entries: HistoryEntry[] = await this.memo.get(this.file, async (): Promise<HistoryEntry[]> => parseHistory(wholeLines(await readTail(this.file, HISTORY_READ_BYTES))));
      return promptsOf(entries, project, (entry: HistoryEntry): string => expandPastes(entry, (hash: string): string | null => this.cachedPaste(hash)));
    } catch {
      return [];
    }
  }

  private cachedPaste(hash: string): string | null {
    if (!PASTE_HASH.test(hash)) return null;
    try {
      return readFileSync(join(this.pasteDir, `${hash}.txt`), 'utf8');
    } catch {
      return null;
    }
  }
}

// Reading from the middle of the file starts inside a line; that piece is not a prompt.
function wholeLines(tail: TailText): string {
  if (tail.reachedStart) return tail.text;
  const firstBreak: number = tail.text.indexOf('\n');
  return firstBreak === -1 ? '' : tail.text.slice(firstBreak + 1);
}
