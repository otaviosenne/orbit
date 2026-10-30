import { saveShared } from './shared-storage';

const STORAGE_KEY: string = 'orbit.pinned';

// Chats pinned to the row above the board, in the order they were pinned.
export class PinnedChats {
  private readonly sessionIds: string[] = load();

  // Another Orbit window changed the pins.
  reload(): void {
    this.sessionIds.splice(0, this.sessionIds.length, ...load());
  }

  has(sessionId: string): boolean {
    return this.sessionIds.includes(sessionId);
  }

  get order(): readonly string[] {
    return this.sessionIds;
  }

  toggle(sessionId: string): void {
    if (this.has(sessionId)) this.unpin(sessionId);
    else this.pin(sessionId);
  }

  // Pinning twice keeps the first place, so dropping a pinned chat's column card on Pinned changes nothing.
  pin(sessionId: string): void {
    if (this.has(sessionId)) return;
    this.sessionIds.push(sessionId);
    save(this.sessionIds);
  }

  // The row's new order; a pin the row did not show (no card info yet) keeps its place at the end.
  setOrder(order: readonly string[]): void {
    const shown: string[] = order.filter((sessionId: string) => this.has(sessionId));
    const hidden: string[] = this.sessionIds.filter((sessionId: string) => !shown.includes(sessionId));
    this.sessionIds.splice(0, this.sessionIds.length, ...shown, ...hidden);
    save(this.sessionIds);
  }

  unpin(sessionId: string): void {
    const index: number = this.sessionIds.indexOf(sessionId);
    if (index === -1) return;
    this.sessionIds.splice(index, 1);
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
  saveShared(STORAGE_KEY, JSON.stringify(sessionIds));
}
