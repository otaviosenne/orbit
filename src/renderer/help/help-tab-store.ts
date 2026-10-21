import type { HelpTab } from './help-tab';
import { parseHelpTab } from './help-tab';

const STORAGE_KEY: string = 'orbit.help-tab';

// Null until a tab is picked, so a phone keeps starting on Questions until its owner chooses otherwise.
export function loadHelpTab(): HelpTab | null {
  try {
    return parseHelpTab(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveHelpTab(tab: HelpTab): void {
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // The tab still applies until Orbit restarts.
  }
}
