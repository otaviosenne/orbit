// The terminal windows whose input holds a chat's queue being edited. Typing anything else there (a message, a
// command) would clear part of it and send the rest along, so delivery waits for the edit to end.
const heldWindows: Set<number> = new Set();

export function holdInput(windowPid: number): void {
  heldWindows.add(windowPid);
}

export function freeInput(windowPid: number): void {
  heldWindows.delete(windowPid);
}

export function isInputHeld(windowPid: number): boolean {
  return heldWindows.has(windowPid);
}
