const STORAGE_KEY: string = 'orbit.suspended-collapsed';
const COLLAPSED: string = '1';

// Whether the Suspended section is folded to its header; storage can be unavailable, then it starts open.
export function loadSuspendedCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === COLLAPSED;
  } catch {
    return false;
  }
}

export function saveSuspendedCollapsed(isCollapsed: boolean): void {
  try {
    if (isCollapsed) localStorage.setItem(STORAGE_KEY, COLLAPSED);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not persisted.
  }
}
