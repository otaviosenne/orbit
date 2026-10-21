import { describe, expect, it } from 'vitest';
import { matchChromeWindow, matchPageTarget, tabCouldBeOpenIn } from '../src/core/devices/browser-match';
import type { PageTarget } from '../src/core/devices/browser-match';
import type { BrowserTabReference, EmulatorReference } from '../src/core/devices/device-references';
import type { DesktopWindow } from '../src/core/devices/desktop-window';
import { emulatorLabel, emulatorWindows, pickEmulatorWindow } from '../src/core/devices/emulator-windows';
import { parseBootTime } from '../src/core/process-start';

const T0: number = Date.parse('2026-10-21T10:00:00.000Z');
const MINUTE_MS: number = 60_000;

function window(className: string, title: string, overrides: Partial<DesktopWindow> = {}): DesktopWindow {
  return { address: `0x${title.length}${className.length}`, pid: 100, className, title, focusHistoryId: 5, startedAt: T0, ...overrides };
}

function reference(port: number | null, avd: string | null = null, minute: number = 10): EmulatorReference {
  return { port, avd, at: T0 + minute * MINUTE_MS };
}

const PIXEL_2: DesktopWindow = window('Emulator', 'Android Emulator - Pixel_6a_2:5558', { address: '0xa2' });
const PIXEL_3: DesktopWindow = window('Emulator', 'Android Emulator - Pixel_6a_3:5556', { address: '0xa3' });
const TERMINAL: DesktopWindow = window('kitty', 'Android Emulator - fake:5556', { address: '0xk' });

describe('emulatorWindows', () => {
  it('reads AVD and port from emulator windows only', () => {
    expect(emulatorWindows([PIXEL_2, TERMINAL]).map(emulatorLabel)).toEqual(['Pixel_6a_2:5558']);
  });
});

describe('pickEmulatorWindow', () => {
  it('matches by port before anything else, the AVD on a port varying from run to run', () => {
    expect(pickEmulatorWindow([reference(5556, 'Pixel_6a_2')], [PIXEL_2, PIXEL_3])?.window.address).toBe('0xa3');
  });

  it('matches an AVD name when the reference has no port', () => {
    expect(pickEmulatorWindow([reference(null, 'Pixel_6a_2')], [PIXEL_2, PIXEL_3])?.window.address).toBe('0xa2');
  });

  it('prefers the most recent reference that is still open', () => {
    const references: EmulatorReference[] = [reference(5558, null, 1), reference(5556, null, 2), reference(5560, null, 3)];
    expect(pickEmulatorWindow(references, [PIXEL_2, PIXEL_3])?.window.address).toBe('0xa3');
  });

  it('uses an unnamed reference only when a single emulator is open', () => {
    expect(pickEmulatorWindow([reference(null)], [PIXEL_2])?.window.address).toBe('0xa2');
    expect(pickEmulatorWindow([reference(null)], [PIXEL_2, PIXEL_3])).toBeNull();
  });

  it('skips a reference made long before that emulator started, which meant an earlier emulator on the port', () => {
    const restarted: DesktopWindow = { ...PIXEL_3, startedAt: T0 + 60 * MINUTE_MS };
    expect(pickEmulatorWindow([reference(5556, null, 10)], [restarted])).toBeNull();
    expect(pickEmulatorWindow([reference(5556, null, 59)], [restarted])?.window.address).toBe('0xa3');
  });

  it('finds nothing when no emulator is open', () => {
    expect(pickEmulatorWindow([reference(5556)], [TERMINAL])).toBeNull();
  });
});

describe('browser matching', () => {
  const tab: BrowserTabReference = { tabId: 1143462222, title: 'Swagger UI', url: 'http://127.0.0.1:8077/docs#/', at: T0 + 30 * MINUTE_MS };
  const targets: PageTarget[] = [
    { id: 'A1', title: 'Inbox', url: 'https://mail.google.com/' },
    { id: 'B2', title: 'Swagger UI', url: 'http://127.0.0.1:8077/docs#/comments' },
    { id: 'C3', title: 'Other', url: 'http://127.0.0.1:8077/docs#/' },
  ];

  it('matches a DevTools page by URL first, then by title, then by a host only one page has', () => {
    expect(matchPageTarget(tab, targets)?.id).toBe('C3');
    expect(matchPageTarget(tab, targets.slice(0, 2))?.id).toBe('B2');
    const moved: BrowserTabReference = { ...tab, title: 'Gone', url: 'https://mail.google.com/mail/u/0' };
    expect(matchPageTarget(moved, targets)?.id).toBe('A1');
    expect(matchPageTarget({ ...tab, title: 'Gone', url: 'http://127.0.0.1:8077/x' }, targets)).toBeNull();
  });

  it('finds the Chrome window whose active tab is the chat tab, ignoring other apps', () => {
    const windows: DesktopWindow[] = [
      window('kitty', 'Swagger UI - Google Chrome', { address: '0xk' }),
      window('google-chrome', 'Inbox - Google Chrome', { address: '0xc1' }),
      window('google-chrome', 'Swagger UI - Google Chrome', { address: '0xc2' }),
    ];
    expect(matchChromeWindow(tab, windows)?.address).toBe('0xc2');
    expect(matchChromeWindow({ ...tab, title: 'Elsewhere' }, windows.slice(0, 2))).toBeNull();
  });

  it('rules out a Chrome started after the chat last used the tab', () => {
    expect(tabCouldBeOpenIn(tab, window('google-chrome', 'x', { startedAt: T0 }))).toBe(true);
    expect(tabCouldBeOpenIn(tab, window('google-chrome', 'x', { startedAt: T0 + 31 * MINUTE_MS }))).toBe(false);
  });
});

describe('parseBootTime', () => {
  it('reads btime from /proc/stat in milliseconds', () => {
    expect(parseBootTime('cpu  1 2 3\nbtime 1792588262\nprocesses 9\n')).toBe(1792588262000);
  });
});
