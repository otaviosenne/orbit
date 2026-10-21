import { describe, expect, it } from 'vitest';
import type { ChromeSession, SessionWindow } from '../src/core/devices/chrome-session';
import { chromeUserDataDir } from '../src/core/devices/chrome-user-data';
import type { DesktopWindow } from '../src/core/devices/desktop-window';
import type { SessionTabPlace } from '../src/core/devices/session-tab-plan';
import { currentRank, findSessionTab, screenWindowOf, stepsBetween } from '../src/core/devices/session-tab-plan';

function chromeWindow(activeTitle: string, overrides: Partial<DesktopWindow> = {}): DesktopWindow {
  return {
    address: `0x${activeTitle.length}`,
    pid: 100,
    className: 'google-chrome',
    title: `${activeTitle} - Google Chrome`,
    focusHistoryId: 3,
    startedAt: 0,
    ...overrides,
  };
}

function sessionWindow(id: number, titles: string[], selectedRank: number | null): SessionWindow {
  return { id, tabs: titles.map((title: string, rank: number) => ({ id: id * 100 + rank, title, url: '' })), selectedRank };
}

const WORK: SessionWindow = sessionWindow(1, ['Mail', 'Docs', 'Claude tab', 'Docs'], 0);
const OTHER: SessionWindow = sessionWindow(2, ['Music'], 0);
const SESSION: ChromeSession = { windows: [WORK, OTHER] };

function placeOf(tabId: number): SessionTabPlace {
  const place: SessionTabPlace | null = findSessionTab(SESSION, tabId);
  if (place === null) throw new Error(`tab ${tabId} not in the session`);
  return place;
}

describe('findSessionTab', () => {
  it('finds the window and position of a chrome.tabs id', () => {
    expect(placeOf(102)).toMatchObject({ rank: 2, window: { id: 1 }, tab: { title: 'Claude tab' } });
    expect(findSessionTab(SESSION, 999)).toBeNull();
  });
});

describe('screenWindowOf', () => {
  it('picks the Chrome window showing one of the session window tabs, the latest focused first', () => {
    const music: DesktopWindow = chromeWindow('Music', { address: '0xm', focusHistoryId: 0 });
    const older: DesktopWindow = chromeWindow('Mail', { address: '0xold', focusHistoryId: 5 });
    const newer: DesktopWindow = chromeWindow('Docs', { address: '0xnew', focusHistoryId: 1 });
    expect(screenWindowOf(placeOf(102), SESSION, [music, older, newer])?.address).toBe('0xnew');
  });

  it('ignores titles another window also has, which cannot tell the windows apart', () => {
    const left: SessionWindow = sessionWindow(1, ['New Tab', 'Claude tab'], 0);
    const right: SessionWindow = sessionWindow(2, ['New Tab', 'Music'], 0);
    const shared: ChromeSession = { windows: [left, right] };
    const place: SessionTabPlace | null = findSessionTab(shared, 101);
    if (place === null) throw new Error('tab 101 not in the session');
    const newTab: DesktopWindow = chromeWindow('New Tab', { address: '0xnew', focusHistoryId: 0 });
    expect(screenWindowOf(place, shared, [newTab, chromeWindow('Music', { address: '0xm' })])).toBeNull();
    expect(screenWindowOf(place, shared, [newTab, chromeWindow('Claude tab', { address: '0xc' })])?.address).toBe('0xc');
  });

  it('takes the only window of a one-window Chrome even when its title is not saved yet', () => {
    const single: ChromeSession = { windows: [WORK] };
    expect(screenWindowOf(placeOf(102), single, [chromeWindow('Just opened')])?.address).toBeDefined();
    expect(screenWindowOf(placeOf(102), SESSION, [chromeWindow('Just opened')])).toBeNull();
  });
});

describe('currentRank', () => {
  it('trusts the live window title over the saved selection', () => {
    expect(currentRank(WORK, chromeWindow('Claude tab'))).toEqual({ rank: 2, fromLiveTitle: true });
  });

  it('falls back to the saved selection when the title is shared or unknown', () => {
    expect(currentRank(WORK, chromeWindow('Docs'))).toEqual({ rank: 0, fromLiveTitle: false });
    expect(currentRank(WORK, chromeWindow('Loading…'))).toEqual({ rank: 0, fromLiveTitle: false });
    expect(currentRank({ ...WORK, selectedRank: null }, chromeWindow('Loading…'))).toBeNull();
  });
});

describe('stepsBetween', () => {
  it('walks the shorter way, wrapping around the tab strip', () => {
    expect(stepsBetween(1, 3, 10)).toEqual({ direction: 'next', count: 2 });
    expect(stepsBetween(3, 1, 10)).toEqual({ direction: 'previous', count: 2 });
    expect(stepsBetween(0, 9, 10)).toEqual({ direction: 'previous', count: 1 });
    expect(stepsBetween(9, 0, 10)).toEqual({ direction: 'next', count: 1 });
  });

  it('needs no step when the tab is already shown', () => {
    expect(stepsBetween(4, 4, 10).count).toBe(0);
  });
});

describe('chromeUserDataDir', () => {
  it('prefers the --user-data-dir flag', () => {
    expect(chromeUserDataDir(['/opt/google/chrome/chrome', '--user-data-dir=/tmp/profile'], 'google-chrome', '/home/u/.config')).toBe('/tmp/profile');
  });

  it('otherwise uses the build folder named after the window class', () => {
    expect(chromeUserDataDir([], 'google-chrome-beta', '/home/u/.config')).toBe('/home/u/.config/google-chrome-beta');
    expect(chromeUserDataDir([], 'chromium-browser', '/home/u/.config')).toBe('/home/u/.config/chromium');
  });
});
