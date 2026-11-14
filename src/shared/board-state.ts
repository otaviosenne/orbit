// Board choices kept by the main process instead of each window's localStorage: Orbit Web on a phone is another
// origin with storage of its own, so pins and suspended chats kept only there were missing from the phone's board.
// orbit.open-chats is the chats left open by a shutdown, which come back as Closed cards on every Orbit window.
export const SHARED_BOARD_KEYS: readonly string[] = ['orbit.pinned', 'orbit.pinned-info', 'orbit.suspended', 'orbit.open-chats'];

export interface BoardState {
  // Each key's stored text, exactly as the window's localStorage holds it.
  readonly values: Readonly<Record<string, string>>;
  // Changes with every write, so a window asks for the values only when something moved.
  readonly version: number;
}

export function isSharedBoardKey(key: unknown): key is string {
  return typeof key === 'string' && SHARED_BOARD_KEYS.includes(key);
}
