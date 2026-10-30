import { SHARED_BOARD_KEYS, type BoardState } from '../../shared/board-state';
import type { ActionResult } from '../../shared/types';
import { publishBoardTo } from './shared-storage';

export interface BoardStateApi {
  getBoardState(knownVersion: number | null): Promise<BoardState | null>;
  setBoardState(key: string, value: string): Promise<ActionResult>;
}

// Keeps this window's copy of the shared board keys in step with the main process: other windows' writes are copied
// into localStorage and announced through onChange, so the stores read them again; this window's writes go out.
export class BoardSync {
  private version: number | null = null;
  // Keys being sent: an answer about them that left before the write landed is older than what this window holds.
  private readonly sending: Set<string> = new Set();
  private writes: number = 0;

  constructor(
    private readonly api: BoardStateApi,
    private readonly storage: Storage,
    private readonly onChange: () => void,
  ) {}

  // On first contact the main process wins. With fillMissing, keys it has never held are filled from this window:
  // that is how pins kept before the board was shared reach it. Only the desktop does this, never a phone.
  async start(fillMissing: boolean): Promise<void> {
    publishBoardTo((key: string, value: string): void => this.send(key, value));
    await this.refresh(fillMissing);
  }

  async refresh(fillMissing: boolean = false): Promise<void> {
    const writesBefore: number = this.writes;
    const state: BoardState | null = await this.api.getBoardState(this.version).catch((): null => null);
    if (state === null || writesBefore !== this.writes) return;
    this.version = state.version;
    let changed: boolean = false;
    for (const key of SHARED_BOARD_KEYS) {
      if (this.sending.has(key)) continue;
      const shared: string | undefined = state.values[key];
      const local: string | null = this.storage.getItem(key);
      if (shared === undefined) {
        if (fillMissing && local !== null) this.send(key, local);
      } else if (shared !== local) {
        this.storage.setItem(key, shared);
        changed = true;
      }
    }
    if (changed) this.onChange();
  }

  private send(key: string, value: string): void {
    this.writes += 1;
    this.sending.add(key);
    void this.api.setBoardState(key, value).catch((): null => null).finally((): void => void this.sending.delete(key));
  }
}
