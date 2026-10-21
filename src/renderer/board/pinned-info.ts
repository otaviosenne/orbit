import type { ChatSnapshot } from '../../shared/types';

const STORAGE_KEY: string = 'orbit.pinned-info';

// What a pinned chat looked like while it was open, so its card can stay in the Pinned row after it closes.
interface PinnedInfo {
  readonly name: string;
  readonly color: string | null;
  readonly repositoryName: string;
  readonly repositoryRoot: string;
  readonly cwd: string;
  readonly lastReplyAt: number | null;
}

export class PinnedInfoStore {
  private readonly entries: Map<string, PinnedInfo> = new Map(load());

  // Called on each poll with the pinned chats that are open now.
  remember(chats: readonly ChatSnapshot[]): void {
    let changed: boolean = false;
    for (const chat of chats) {
      const info: PinnedInfo = toInfo(chat);
      if (JSON.stringify(this.entries.get(chat.sessionId)) === JSON.stringify(info)) continue;
      this.entries.set(chat.sessionId, info);
      changed = true;
    }
    if (changed) save([...this.entries]);
  }

  // A stand-in snapshot for a pinned chat that is closed: read-only, no process behind it.
  closedSnapshot(sessionId: string): ChatSnapshot | null {
    const info: PinnedInfo | undefined = this.entries.get(sessionId);
    if (info === undefined) return null;
    return {
      sessionId, pid: 0, name: info.name, color: info.color,
      repository: { name: info.repositoryName, root: info.repositoryRoot }, cwd: info.cwd, startedAt: 0,
      status: 'idle', statusSince: info.lastReplyAt ?? 0, lastReplyAt: info.lastReplyAt,
      agents: [], shells: [], isFocused: false,
    };
  }
}

function toInfo(chat: ChatSnapshot): PinnedInfo {
  return {
    name: chat.name, color: chat.color, repositoryName: chat.repository.name, repositoryRoot: chat.repository.root,
    cwd: chat.cwd, lastReplyAt: chat.lastReplyAt,
  };
}

// Storage can be unavailable; then closed pins simply drop out of the row for this run.
function load(): [string, PinnedInfo][] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? (stored as [string, PinnedInfo][]) : [];
  } catch {
    return [];
  }
}

function save(entries: [string, PinnedInfo][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Not persisted.
  }
}
