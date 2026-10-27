import type { ChatSnapshot, PauseReport, PauseTarget } from '../../shared/types';
import { isMidWork, pauseTargets } from './pause-targets';

const STORAGE_KEY: string = 'orbit.paused-chats';
// A paused chat is busy for a moment answering the pause itself; only what happens after that means the user sent it back to work.
const SETTLE_GRACE_MS: number = 30_000;

interface PausedChat {
  readonly pausedAt: number;
  // Once the chat has settled: its last reply then, so a newer one shows it was told to work again. Not set while settling.
  readonly settledReplyAt?: number | null;
}

export interface PauseApi {
  pauseChats(targets: readonly PauseTarget[]): Promise<PauseReport>;
  continueChats(pids: readonly number[]): Promise<PauseReport>;
}

// The chats told to stop. They are remembered across restarts: a paused chat is still waiting for its go-ahead after a
// reboot, so Continue reaches it once it is open again.
export class ChatPause {
  private paused: Map<string, PausedChat> = load();

  constructor(
    private readonly chats: () => readonly ChatSnapshot[],
    private readonly api: PauseApi,
    private readonly clock: () => number = Date.now,
  ) {}

  // The paused chats that are open now: the ones Continue can reach.
  get pausedCount(): number {
    return this.pausedChats().length;
  }

  async pauseAll(): Promise<void> {
    const targets: PauseTarget[] = pauseTargets(this.chats(), new Set(this.paused.keys()));
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
    const gone: string[] = [...this.paused.keys()].filter((sessionId: string) => !knownSessionIds.has(sessionId));
    if (gone.length === 0) return;
    gone.forEach((sessionId: string): boolean => this.paused.delete(sessionId));
    save(this.paused);
  }

  // With every poll: a paused chat that is working again, or has replied since it settled, was sent back to work by
  // hand, so it is no longer paused and Continue must not tell it to carry on a second time.
  settle(live: readonly ChatSnapshot[], now: number): void {
    let changed: boolean = false;
    for (const chat of live) {
      const entry: PausedChat | undefined = this.paused.get(chat.sessionId);
      if (entry === undefined) continue;
      if (entry.settledReplyAt === undefined) {
        if (now - entry.pausedAt >= SETTLE_GRACE_MS && !isMidWork(chat)) this.paused.set(chat.sessionId, { ...entry, settledReplyAt: chat.lastReplyAt });
      } else if (isMidWork(chat) || chat.lastReplyAt !== entry.settledReplyAt) {
        this.paused.delete(chat.sessionId);
        changed = true;
      }
    }
    if (changed) save(this.paused);
  }

  private pausedChats(): ChatSnapshot[] {
    return this.chats().filter((chat: ChatSnapshot) => this.paused.has(chat.sessionId));
  }

  private remember(pids: readonly number[], paused: boolean): void {
    for (const chat of this.chats().filter((candidate: ChatSnapshot) => pids.includes(candidate.pid))) {
      if (paused) this.paused.set(chat.sessionId, { pausedAt: this.clock() });
      else this.paused.delete(chat.sessionId);
    }
    save(this.paused);
  }
}

// Older saves were a plain list of ids; those chats were paused some time ago, so they settle at the first quiet look.
function load(): Map<string, PausedChat> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Map((Array.isArray(parsed) ? parsed : []).flatMap((item: unknown): [string, PausedChat][] => entryOf(item)));
  } catch {
    return new Map();
  }
}

function entryOf(item: unknown): [string, PausedChat][] {
  if (typeof item === 'string') return [[item, { pausedAt: 0 }]];
  const saved: Partial<Record<'sessionId' | 'pausedAt', unknown>> = (item ?? {}) as Partial<Record<'sessionId' | 'pausedAt', unknown>>;
  return typeof saved.sessionId === 'string' && typeof saved.pausedAt === 'number' ? [[saved.sessionId, { pausedAt: saved.pausedAt }]] : [];
}

// Only when it was paused is saved: whether a chat has settled is read again from the chat after a restart.
function save(paused: ReadonlyMap<string, PausedChat>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...paused].map(([sessionId, entry]) => ({ sessionId, pausedAt: entry.pausedAt }))));
  } catch {
    // Without storage the pause still works for this run; only the memory across restarts is lost.
  }
}
