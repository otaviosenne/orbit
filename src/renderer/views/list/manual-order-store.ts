const STORAGE_KEY: string = 'orbit.list-order';

// The List's manual order, by session id. Written only when the user moves a row, never while rendering: the first
// render runs before the first poll, with no chats yet, and would otherwise wipe the saved order.
export class ManualOrderStore {
  private sessionIds: readonly string[] = load();

  get order(): readonly string[] {
    return this.sessionIds;
  }

  save(sessionIds: readonly string[]): void {
    this.sessionIds = [...sessionIds];
    persist(this.sessionIds);
  }
}

export function parseManualOrder(stored: string | null): string[] {
  const parsed: unknown = JSON.parse(stored ?? '[]');
  return Array.isArray(parsed) ? parsed.filter((value: unknown): value is string => typeof value === 'string') : [];
}

// Storage can be unavailable or hold something unreadable; then the order starts over for this run.
function load(): string[] {
  try {
    return parseManualOrder(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function persist(sessionIds: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionIds));
  } catch {
    // Not persisted.
  }
}
