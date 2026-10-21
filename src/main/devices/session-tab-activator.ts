import type { BrowserTabReference } from '../../core/devices/device-references';
import type { DesktopWindow } from '../../core/devices/desktop-window';
import { activeTabTitle } from '../../core/devices/browser-match';
import type { StartRank, TabSteps } from '../../core/devices/session-tab-plan';
import { currentRank, screenWindowOf, stepsBetween } from '../../core/devices/session-tab-plan';
import type { DeviceFocus } from '../../shared/types';
import { delay } from '../run-command';
import { memorySaverMayDiscard } from './chrome-memory-saver';
import type { SessionTabFound } from './chrome-session-files';
import { findTabInSessions, userDataDirOf } from './chrome-session-files';
import { pressTabSteps } from './chrome-tab-keys';
import type { ChromeInstance } from './chrome-instances';
import type { DesktopWindowList } from './desktop-windows';
import { focusWindowAt } from './desktop-windows';

// Every step shows the tab it passes for a moment; past this many, the walk would flash through too much of
// the user's work, so the window alone is shown.
const MAX_TAB_STEPS: number = 10;
// Chrome retitles the window a moment after the last step; the check waits for it before trusting the title.
const RETITLE_WAIT_MS: number = 200;

// A Chrome without DevTools cannot be asked to activate a tab, but its session file says where the tab sits in
// which window, and Chrome's own next/previous tab keys can walk there. Only tabs are switched: nothing is typed.
export class SessionTabActivator {
  constructor(private readonly windowList: DesktopWindowList) {}

  // Null when the session file cannot place the tab, so the caller falls back to guessing the window.
  async activate(tab: BrowserTabReference, chrome: ChromeInstance): Promise<DeviceFocus | null> {
    const className: string | undefined = chrome.windows[0]?.className;
    if (className === undefined) return null;
    const userDataDir: string = await userDataDirOf(chrome.pid, className);
    const found: SessionTabFound | null = await findTabInSessions(userDataDir, tab.tabId, startedAt(chrome));
    const screen: DesktopWindow | null = found === null ? null : screenWindowOf(found.place, found.session, chrome.windows);
    if (found === null || screen === null) return null;
    await focusWindowAt(screen.address);
    const from: StartRank | null = currentRank(found.place.window, screen);
    if (from === null || (!from.fromLiveTitle && chrome.windows.length > 1)) return 'window';
    const steps: TabSteps = stepsBetween(from.rank, found.place.rank, found.place.window.tabs.length);
    if (steps.count === 0) return 'exact';
    if (steps.count > MAX_TAB_STEPS || (await memorySaverMayDiscard(userDataDir))) return 'window';
    await pressTabSteps(screen.address, steps);
    return (await this.isShowing(screen, [found.place.tab.title, tab.title])) ? 'exact' : 'window';
  }

  // Checked once and never corrected: each extra key would show yet another of the user's tabs.
  private async isShowing(screen: DesktopWindow, titles: readonly (string | null)[]): Promise<boolean> {
    await delay(RETITLE_WAIT_MS);
    const now: DesktopWindow | undefined = (await this.windowList.fresh()).find((window: DesktopWindow) => window.address === screen.address);
    return now !== undefined && titles.some((title: string | null) => title !== null && title.length > 0 && title === activeTabTitle(now));
  }
}

function startedAt(chrome: ChromeInstance): number | null {
  return chrome.windows.find((window: DesktopWindow) => window.startedAt !== null)?.startedAt ?? null;
}
