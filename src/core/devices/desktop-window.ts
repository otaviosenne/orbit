// A top-level window as Hyprland lists it, plus when its process started (null when that could not be read).
export interface DesktopWindow {
  readonly address: string;
  readonly pid: number;
  readonly className: string;
  readonly title: string;
  // 0 is the window focused last, 1 the one before it, and so on.
  readonly focusHistoryId: number;
  readonly startedAt: number | null;
}

export function mostRecentlyFocused(windows: readonly DesktopWindow[]): DesktopWindow | null {
  return [...windows].sort((left: DesktopWindow, right: DesktopWindow) => left.focusHistoryId - right.focusHistoryId)[0] ?? null;
}
