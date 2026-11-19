import type { ShortcutsToken } from '../../shared/remote-settings';
import { REMOTE_SHORTCUTS_TOKEN_PATH } from '../../shared/remote-settings';

// Asks the computer for a new Shortcuts credential; only a page already signed in to Orbit Web gets one.
export async function requestShortcutsToken(): Promise<string | null> {
  try {
    const response: Response = await fetch(REMOTE_SHORTCUTS_TOKEN_PATH, { method: 'POST', credentials: 'same-origin' });
    return response.ok ? ((await response.json()) as ShortcutsToken).token : null;
  } catch {
    return null;
  }
}
