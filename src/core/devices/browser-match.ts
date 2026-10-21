import type { BrowserTabReference } from './device-references';
import type { DesktopWindow } from './desktop-window';

// A page of a Chrome that exposes DevTools, as its /json/list endpoint describes it.
export interface PageTarget {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

// google-chrome, google-chrome-beta, chromium: every Chromium build Claude in Chrome can live in.
const CHROME_CLASS: RegExp = /^(google-chrome|chromium)/i;
// Chrome titles each window after its active tab: "<tab title> - Google Chrome".
const CHROME_TITLE_SUFFIX: RegExp = /\s-\s(Google Chrome|Chromium)( \(.*\))?$/;

export function isChromeWindow(window: DesktopWindow): boolean {
  return CHROME_CLASS.test(window.className);
}

// A tab id from before this Chrome started belongs to an earlier run of it: that tab is gone.
export function tabCouldBeOpenIn(tab: BrowserTabReference, chrome: DesktopWindow): boolean {
  return chrome.startedAt === null || tab.at >= chrome.startedAt;
}

// Same URL first, then same title, then the only page on the same host.
export function matchPageTarget(tab: BrowserTabReference, targets: readonly PageTarget[]): PageTarget | null {
  const byUrl: PageTarget | undefined = tab.url === null ? undefined : targets.find((target: PageTarget) => target.url === tab.url);
  if (byUrl !== undefined) return byUrl;
  const byTitle: PageTarget | undefined = tab.title === null ? undefined : targets.find((target: PageTarget) => target.title === tab.title);
  if (byTitle !== undefined) return byTitle;
  const host: string | null = hostOf(tab.url);
  const sameHost: PageTarget[] = host === null ? [] : targets.filter((target: PageTarget) => hostOf(target.url) === host);
  return sameHost.length === 1 ? (sameHost[0] ?? null) : null;
}

// Only a window whose active tab is the chat's tab shows its title; the host is a looser hint for pages titled by URL.
export function matchChromeWindow(tab: BrowserTabReference, windows: readonly DesktopWindow[]): DesktopWindow | null {
  const chromes: DesktopWindow[] = windows.filter(isChromeWindow);
  const byTitle: DesktopWindow | undefined =
    tab.title === null ? undefined : chromes.find((window: DesktopWindow) => activeTabTitle(window) === tab.title);
  if (byTitle !== undefined) return byTitle;
  const host: string | null = hostOf(tab.url);
  return host === null ? null : (chromes.find((window: DesktopWindow) => activeTabTitle(window).includes(host)) ?? null);
}

export function activeTabTitle(window: DesktopWindow): string {
  return window.title.replace(CHROME_TITLE_SUFFIX, '');
}

export function hostOf(url: string | null): string | null {
  if (url === null) return null;
  try {
    const host: string = new URL(url).host;
    return host.length > 0 ? host : null;
  } catch {
    return null;
  }
}
