// A thread that shows only its latest pages and can bring in the one before the oldest shown.
export interface OlderHistory {
  readonly canLoadOlder: boolean;
  // Resolves true once more items are shown; false when nothing was added (no more history, or the thread changed).
  loadOlder(): Promise<boolean>;
}

// Brings in older pages one at a time until `find` succeeds or the history runs out.
export async function searchOlder<T>(find: () => T | null, history: OlderHistory): Promise<T | null> {
  for (;;) {
    const found: T | null = find();
    if (found !== null) return found;
    if (!history.canLoadOlder || !(await history.loadOlder())) return null;
  }
}
