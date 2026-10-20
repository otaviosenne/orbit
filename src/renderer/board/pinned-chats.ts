const STORAGE_KEY: string = 'orbit.pinned';

// Chats pinned to the row above the board, in the order they were pinned.
export class PinnedChats {
  private readonly sessionIds: string[] = load();

  has(sessionId: string): boolean {
    return this.sessionIds.includes(sessionId);
  }

  get order(): readonly string[] {
    return this.sessionIds;
  }

  toggle(sessionId: string): void {
    const index: number = this.sessionIds.indexOf(sessionId);
    if (index === -1) this.sessionIds.push(sessionId);
    else this.sessionIds.splice(index, 1);
    save(this.sessionIds);
  }
}

// Storage can be unavailable; then pins simply last for this run.
function load(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((value: unknown): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function save(sessionIds: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionIds));
  } catch {
    // Not persisted.
  }
}
