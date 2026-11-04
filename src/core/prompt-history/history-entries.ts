// Claude Code's prompt history (~/.claude/history.jsonl): one line per prompt typed in any chat, with the folder it was
// typed in. Up and Down in a chat window walk the entries of its folder; Orbit's composer walks the same ones.

export interface HistoryEntry {
  readonly display: string;
  readonly project: string;
  readonly pasted: ReadonlyMap<string, PastedText>;
}

// A paste is kept inline, or only as a hash naming its file in ~/.claude/paste-cache.
export interface PastedText {
  readonly content: string | null;
  readonly hash: string | null;
}

// How many prompts the composer can step back through, as in the chat window.
export const HISTORY_LIMIT: number = 100;
const PASTE_MARKER: RegExp = /\[Pasted text #(\d+)(?: \+\d+ lines)?\]/g;

export function parseHistory(text: string): HistoryEntry[] {
  return text.split('\n').flatMap((line: string): HistoryEntry[] => {
    const entry: HistoryEntry | null = parseLine(line);
    return entry === null ? [] : [entry];
  });
}

// The folder's prompts, oldest first, the newest HISTORY_LIMIT of them; the same prompt sent twice in a row counts once.
export function promptsOf(entries: readonly HistoryEntry[], project: string, expand: (entry: HistoryEntry) => string): string[] {
  const prompts: string[] = [];
  for (const entry of entries) {
    if (entry.project !== project) continue;
    const prompt: string = expand(entry).trim();
    if (prompt.length > 0 && prompt !== prompts[prompts.length - 1]) prompts.push(prompt);
  }
  return prompts.slice(-HISTORY_LIMIT);
}

// "[Pasted text #1 +6 lines]" becomes the text pasted, when it can still be found; otherwise the marker stays.
export function expandPastes(entry: HistoryEntry, cached: (hash: string) => string | null): string {
  return entry.display.replace(PASTE_MARKER, (marker: string, id: string): string => {
    const pasted: PastedText | undefined = entry.pasted.get(id);
    return pasted?.content ?? (pasted?.hash != null ? cached(pasted.hash) : null) ?? marker;
  });
}

function parseLine(line: string): HistoryEntry | null {
  if (line.trim().length === 0) return null;
  try {
    const raw: unknown = JSON.parse(line);
    if (typeof raw !== 'object' || raw === null) return null;
    const record: Record<string, unknown> = raw as Record<string, unknown>;
    if (typeof record['display'] !== 'string' || typeof record['project'] !== 'string') return null;
    return { display: record['display'], project: record['project'], pasted: pastedOf(record['pastedContents']) };
  } catch {
    return null;
  }
}

function pastedOf(raw: unknown): Map<string, PastedText> {
  const pasted: Map<string, PastedText> = new Map();
  if (typeof raw !== 'object' || raw === null) return pasted;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const item: Record<string, unknown> = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    if (item['type'] !== 'text') continue;
    pasted.set(id, { content: typeof item['content'] === 'string' ? item['content'] : null, hash: typeof item['contentHash'] === 'string' ? item['contentHash'] : null });
  }
  return pasted;
}
