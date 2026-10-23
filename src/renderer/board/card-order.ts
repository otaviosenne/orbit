import type { BoardZone } from './drop-rules';

const STORAGE_KEY: string = 'orbit.card-order';

// The order the user gave the cards of each section by dragging them; chats not in it yet (new arrivals) keep the
// board's own order and come first, so a new chat is never hidden at the end.
export class CardOrder {
  private readonly orders: Map<string, string[]> = new Map(load());

  apply<T extends { readonly sessionId: string }>(zone: BoardZone, chats: readonly T[]): T[] {
    const saved: readonly string[] = this.orders.get(zone) ?? [];
    const known: T[] = saved.flatMap((sessionId: string): T[] => chats.filter((chat: T) => chat.sessionId === sessionId));
    const fresh: T[] = chats.filter((chat: T) => !saved.includes(chat.sessionId));
    return [...fresh, ...known];
  }

  set(zone: BoardZone, order: readonly string[]): void {
    this.orders.set(zone, [...order]);
    save([...this.orders]);
  }
}

// Storage can be unavailable; then the order lasts for this run only.
function load(): [string, string[]][] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? (stored as [string, string[]][]) : [];
  } catch {
    return [];
  }
}

function save(entries: [string, string[]][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Not persisted.
  }
}
