import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isSharedBoardKey, type BoardState } from '../../shared/board-state';
import type { ActionResult } from '../../shared/types';
import { failure } from '../terminal-input';

// Pinned info and suspended chats carry a snapshot of each chat; far past this a value is not board state.
const MAX_VALUE_LENGTH: number = 1_000_000;
const SAVED: ActionResult = { ok: true, method: null, error: null };

// The board state every Orbit window shares, saved to a file so it outlives restarts.
export class BoardStateStore {
  private values: Record<string, string> | null = null;
  // Starts from the clock, so a window that knew the version before a restart still sees a change.
  private version: number = Date.now();

  constructor(private readonly path: string) {}

  // Null when the caller already has this version.
  async get(knownVersion: unknown): Promise<BoardState | null> {
    const values: Record<string, string> = await this.load();
    return knownVersion === this.version ? null : { values, version: this.version };
  }

  async set(key: unknown, value: unknown): Promise<ActionResult> {
    if (!isSharedBoardKey(key)) return failure('Not a shared board key');
    if (typeof value !== 'string' || value.length > MAX_VALUE_LENGTH) return failure('Not a board value');
    const values: Record<string, string> = await this.load();
    if (values[key] === value) return SAVED;
    values[key] = value;
    this.version += 1;
    await this.save(values);
    return SAVED;
  }

  private async load(): Promise<Record<string, string>> {
    if (this.values === null) this.values = await readValues(this.path);
    return this.values;
  }

  // Written to a side file and renamed over, so a crash mid-write never leaves half a board.
  private async save(values: Record<string, string>): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const draft: string = `${this.path}.tmp`;
    await writeFile(draft, JSON.stringify(values));
    await rename(draft, this.path);
  }
}

// A missing or unreadable file is an empty board: windows then fill it from their own storage.
async function readValues(path: string): Promise<Record<string, string>> {
  try {
    const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (typeof raw !== 'object' || raw === null) return {};
    return Object.fromEntries(Object.entries(raw).filter(([key, value]: [string, unknown]) => isSharedBoardKey(key) && typeof value === 'string')) as Record<string, string>;
  } catch {
    return {};
  }
}
