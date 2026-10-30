// Saves a shared board key (see shared/board-state.ts) in this window and hands it on to the main process, which
// keeps the copy every Orbit window reads. `share` is false for writes this window only derives from the chats it
// polls: the desktop sends those, and a phone that slept would otherwise send back an older board over a newer one.
export type BoardPublisher = (key: string, value: string) => void;

let publisher: BoardPublisher | null = null;

export function publishBoardTo(publish: BoardPublisher): void {
  publisher = publish;
}

export function saveShared(key: string, value: string, share: boolean = true): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisted here; the main process still keeps it.
  }
  if (share) publisher?.(key, value);
}
