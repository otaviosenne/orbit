import type { PageTarget } from '../../core/devices/browser-match';
import { activeTabTitle, matchChromeWindow, matchPageTarget } from '../../core/devices/browser-match';
import type { BrowserTabReference } from '../../core/devices/device-references';
import type { DesktopWindow } from '../../core/devices/desktop-window';
import { mostRecentlyFocused } from '../../core/devices/desktop-window';
import type { DeviceFocus } from '../../shared/types';
import { delay } from '../run-command';
import { activatePageTarget, listPageTargets } from './chrome-devtools';
import type { ChromeInstance } from './chrome-instances';
import { chromesThatMayHold } from './chrome-instances';
import type { DesktopWindowList } from './desktop-windows';
import { focusWindowAt } from './desktop-windows';

// Same pace as the window list: the panel asks every poll, a tab list changes far less often.
const TARGET_LIST_TTL_MS: number = 3000;
// Chrome retitles the window a moment after a tab is activated; the focus waits for it to find the right window.
const RETITLE_WAIT_MS: number = 150;

// Finds the chat's Claude in Chrome tab from outside Chrome. Exact only through a DevTools port; without one,
// a window's title shows just its active tab, so a tab behind others can only be approached by its window.
export class BrowserLocator {
  private readonly targetLists: Map<number, { readonly at: number; readonly targets: Promise<PageTarget[]> }> = new Map();

  constructor(private readonly windowList: DesktopWindowList) {}

  // A Chrome without DevTools cannot be asked about its tabs, so it counts as possibly holding the tab.
  async mayBeOpen(tab: BrowserTabReference, windows: readonly DesktopWindow[]): Promise<boolean> {
    for (const chrome of await chromesThatMayHold(tab, windows)) {
      if (chrome.devToolsPort === null) return true;
      if (matchPageTarget(tab, await this.recentTargets(chrome.devToolsPort)) !== null) return true;
    }
    return false;
  }

  // Activating a tab is the only thing asked of Chrome: nothing is opened, closed, reloaded or navigated.
  async focus(tab: BrowserTabReference): Promise<DeviceFocus> {
    const chromes: ChromeInstance[] = await chromesThatMayHold(tab, await this.windowList.fresh());
    for (const chrome of chromes) {
      if (chrome.devToolsPort !== null && (await this.activateTab(tab, chrome, chrome.devToolsPort))) return 'exact';
    }
    return focusLikelyWindow(tab, chromes.filter((chrome: ChromeInstance) => chrome.devToolsPort === null).flatMap((chrome) => chrome.windows));
  }

  private async activateTab(tab: BrowserTabReference, chrome: ChromeInstance, port: number): Promise<boolean> {
    const target: PageTarget | null = matchPageTarget(tab, await listPageTargets(port));
    if (target === null || !(await activatePageTarget(port, target.id))) return false;
    await delay(RETITLE_WAIT_MS);
    const own: DesktopWindow[] = (await this.windowList.fresh()).filter((window: DesktopWindow) => window.pid === chrome.pid);
    const showing: DesktopWindow | null = own.find((window: DesktopWindow) => activeTabTitle(window) === target.title) ?? mostRecentlyFocused(own);
    if (showing !== null) await focusWindowAt(showing.address);
    return true;
  }

  private recentTargets(port: number): Promise<PageTarget[]> {
    const now: number = Date.now();
    const cached: { readonly at: number; readonly targets: Promise<PageTarget[]> } | undefined = this.targetLists.get(port);
    if (cached !== undefined && now - cached.at < TARGET_LIST_TTL_MS) return cached.targets;
    const targets: Promise<PageTarget[]> = listPageTargets(port);
    this.targetLists.set(port, { at: now, targets });
    return targets;
  }
}

// The window whose active tab is the chat's is exact; any other Chrome window is only the best guess.
async function focusLikelyWindow(tab: BrowserTabReference, windows: readonly DesktopWindow[]): Promise<DeviceFocus> {
  const showing: DesktopWindow | null = matchChromeWindow(tab, windows);
  if (showing !== null) {
    await focusWindowAt(showing.address);
    return 'exact';
  }
  const latest: DesktopWindow | null = mostRecentlyFocused(windows);
  if (latest === null) return 'missing';
  await focusWindowAt(latest.address);
  return 'window';
}
