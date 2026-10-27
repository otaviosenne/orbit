import type { ChatSnapshot, PauseReport, PauseTarget } from '../../shared/types';
import { pauseTargets } from './pause-targets';

const STORAGE_KEY: string = 'orbit.paused-chats';

export interface PauseApi {
  pauseChats(targets: readonly PauseTarget[]): Promise<PauseReport>;
  continueChats(pids: readonly number[]): Promise<PauseReport>;
}

// The chats told to stop. They are remembered across restarts: a paused chat is still waiting for its go-ahead after a
// reboot, so Continue reaches it once it is open again.
export class ChatPause {
  private sessionIds: Set<string> = load();

  constructor(
    private readonly chats: () => readonly ChatSnapshot[],
    private readonly api: PauseApi,
  ) {}

  // The paused chats that are open now: the ones Continue can reach.
  get pausedCount(): number {
    return this.pausedChats().length;
  }

  async pauseAll(): Promise<void> {
    const targets: PauseTarget[] = pauseTargets(this.chats(), this.sessionIds);
    if (targets.length === 0) return;
    const report: PauseReport = await this.api.pauseChats(targets);
    this.remember(report.reached, true);
    if (report.skipped.length > 0) console.error(`Could not pause ${report.skipped.length} chat(s): no kitty remote control`);
  }

  async continueAll(): Promise<void> {
    const paused: ChatSnapshot[] = this.pausedChats();
    if (paused.length === 0) return;
    const report: PauseReport = await this.api.continueChats(paused.map((chat: ChatSnapshot) => chat.pid));
    this.remember(report.reached, false);
    if (report.skipped.length > 0) console.error(`Could not continue ${report.skipped.length} chat(s): no kitty remote control`);
  }

  // Forgets paused chats that are neither open nor remembered as left open: nothing can bring them back.
  prune(knownSessionIds: ReadonlySet<string>): void {
    const kept: string[] = [...this.sessionIds].filter((sessionId: string) => knownSessionIds.has(sessionId));
    if (kept.length === this.sessionIds.size) return;
    this.sessionIds = new Set(kept);
    save(this.sessionIds);
  }

  private pausedChats(): ChatSnapshot[] {
    return this.chats().filter((chat: ChatSnapshot) => this.sessionIds.has(chat.sessionId));
  }

  private remember(pids: readonly number[], paused: boolean): void {
    for (const chat of this.chats().filter((candidate: ChatSnapshot) => pids.includes(candidate.pid))) {
      if (paused) this.sessionIds.add(chat.sessionId);
      else this.sessionIds.delete(chat.sessionId);
    }
    save(this.sessionIds);
  }
}

function load(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((item: unknown): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function save(sessionIds: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sessionIds]));
  } catch {
    // Without storage the pause still works for this run; only the memory across restarts is lost.
  }
}
