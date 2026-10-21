import type { BrowserTabReference } from '../../core/devices/device-references';
import type { DesktopWindow } from '../../core/devices/desktop-window';
import { isChromeWindow, tabCouldBeOpenIn } from '../../core/devices/browser-match';
import { devToolsPortOf } from './chrome-devtools';

// One running Chrome: its windows and, when it was started with one, its DevTools port.
export interface ChromeInstance {
  readonly pid: number;
  readonly windows: readonly DesktopWindow[];
  readonly devToolsPort: number | null;
}

// The Chromes that may still hold the tab: one started after the chat last used it has new tab ids, so not it.
export async function chromesThatMayHold(tab: BrowserTabReference, windows: readonly DesktopWindow[]): Promise<ChromeInstance[]> {
  const byPid: Map<number, DesktopWindow[]> = new Map();
  for (const window of windows.filter(isChromeWindow)) byPid.set(window.pid, [...(byPid.get(window.pid) ?? []), window]);
  const candidates: [number, DesktopWindow[]][] = [...byPid].filter(([, own]) => own.every((window: DesktopWindow) => tabCouldBeOpenIn(tab, window)));
  return Promise.all(
    candidates.map(async ([pid, own]): Promise<ChromeInstance> => ({ pid, windows: own, devToolsPort: await devToolsPortOf(pid) })),
  );
}
