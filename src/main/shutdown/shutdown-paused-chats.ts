import { readFile, writeFile } from 'node:fs/promises';

// A record older than this belongs to a shutdown whose chats were never reopened; it is not carried on forever.
const KEEP_MS: number = 14 * 24 * 60 * 60_000;

interface PausedEntry {
  readonly sessionId: string;
  readonly pausedAt: number;
}

// The chats a safe shutdown paused, kept on disk across the reboot: reopened afterwards, each is told to carry on,
// as Continue does after Pause all chats.
export class ShutdownPausedChats {
  constructor(private readonly file: string) {}

  async add(sessionIds: readonly string[], now: number): Promise<void> {
    const kept: PausedEntry[] = (await this.load(now)).filter((entry: PausedEntry) => !sessionIds.includes(entry.sessionId));
    await this.save([...kept, ...sessionIds.map((sessionId: string): PausedEntry => ({ sessionId, pausedAt: now }))]);
  }

  async remove(sessionIds: readonly string[], now: number): Promise<void> {
    await this.save((await this.load(now)).filter((entry: PausedEntry) => !sessionIds.includes(entry.sessionId)));
  }

  // Whether the chat was paused by a shutdown; it is forgotten either way, so it is told only once.
  async take(sessionId: string, now: number): Promise<boolean> {
    const entries: PausedEntry[] = await this.load(now);
    if (!entries.some((entry: PausedEntry) => entry.sessionId === sessionId)) return false;
    await this.save(entries.filter((entry: PausedEntry) => entry.sessionId !== sessionId));
    return true;
  }

  private async load(now: number): Promise<PausedEntry[]> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.file, 'utf8'));
      return (Array.isArray(parsed) ? parsed : []).filter((entry: unknown): entry is PausedEntry => isEntry(entry) && now - entry.pausedAt < KEEP_MS);
    } catch {
      return [];
    }
  }

  private async save(entries: readonly PausedEntry[]): Promise<void> {
    await writeFile(this.file, JSON.stringify(entries));
  }
}

function isEntry(value: unknown): value is PausedEntry {
  const entry: Partial<Record<keyof PausedEntry, unknown>> = (value ?? {}) as Partial<Record<keyof PausedEntry, unknown>>;
  return typeof entry.sessionId === 'string' && typeof entry.pausedAt === 'number';
}
