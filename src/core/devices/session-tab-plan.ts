import { activeTabTitle } from './browser-match';
import type { SessionTab, SessionWindow, ChromeSession } from './chrome-session';
import type { DesktopWindow } from './desktop-window';
import { mostRecentlyFocused } from './desktop-window';

export interface SessionTabPlace {
  readonly window: SessionWindow;
  readonly tab: SessionTab;
  readonly rank: number;
}

// Chrome's "next tab" / "previous tab": the only tab shortcuts a page can never intercept, and both wrap around.
export type TabDirection = 'next' | 'previous';

export interface TabSteps {
  readonly direction: TabDirection;
  readonly count: number;
}

export function findSessionTab(session: ChromeSession, tabId: number): SessionTabPlace | null {
  for (const window of session.windows) {
    const rank: number = window.tabs.findIndex((tab: SessionTab) => tab.id === tabId);
    const tab: SessionTab | undefined = window.tabs[rank];
    if (tab !== undefined) return { window, tab, rank };
  }
  return null;
}

// Where the tab starts walking from; a rank guessed from the saved selection is only safe in a one-window Chrome.
export interface StartRank {
  readonly rank: number;
  readonly fromLiveTitle: boolean;
}

// Hyprland only shows each window's active tab title, so a session window is the screen window showing one of
// its tabs; titles other windows also have ("New Tab", "Google") would point at the wrong window.
export function screenWindowOf(place: SessionTabPlace, session: ChromeSession, chromeWindows: readonly DesktopWindow[]): DesktopWindow | null {
  const elsewhere: Set<string> = new Set(
    session.windows.filter((window: SessionWindow) => window.id !== place.window.id).flatMap((window: SessionWindow) => titlesOf(window)),
  );
  const titles: Set<string> = new Set(titlesOf(place.window).filter((title: string) => !elsewhere.has(title)));
  const showing: DesktopWindow[] = chromeWindows.filter((window: DesktopWindow) => titles.has(activeTabTitle(window)));
  if (showing.length > 0) return mostRecentlyFocused(showing);
  const onlyOne: boolean = chromeWindows.length === 1 && session.windows.length === 1;
  return onlyOne ? (chromeWindows[0] ?? null) : null;
}

// The live window title beats the file, which Chrome saves a few seconds late; the file decides only between same-titled tabs.
export function currentRank(window: SessionWindow, screen: DesktopWindow): StartRank | null {
  const title: string = activeTabTitle(screen);
  const matching: number[] = window.tabs.flatMap((tab: SessionTab, rank: number) => (tab.title === title ? [rank] : []));
  const live: number | undefined = matching.length === 1 ? matching[0] : undefined;
  if (live !== undefined) return { rank: live, fromLiveTitle: true };
  return window.selectedRank === null ? null : { rank: window.selectedRank, fromLiveTitle: false };
}

// The shorter way round the tab strip, since every step briefly shows the tab it passes.
export function stepsBetween(from: number, to: number, tabCount: number): TabSteps {
  const forward: number = (((to - from) % tabCount) + tabCount) % tabCount;
  const backward: number = (tabCount - forward) % tabCount;
  return forward <= backward ? { direction: 'next', count: forward } : { direction: 'previous', count: backward };
}

function titlesOf(window: SessionWindow): string[] {
  return window.tabs.map((tab: SessionTab) => tab.title).filter((title: string) => title.length > 0);
}
