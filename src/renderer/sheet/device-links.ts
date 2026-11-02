import type { BrowserLink, ChatDevices, DeviceFocus, EmulatorLink } from '../../shared/types';
import type { CardDeviceKind } from '../board/card-devices';
import { copyDeviceAddress } from '../board/device-copy';
import { requireElement } from '../dom';
import { isWebHost } from '../host';
import { ANDROID_ICON, BROWSER_ICON } from '../icons';
import { setTip } from '../tooltip';

export type StatusReport = (text: string, isError: boolean) => void;

const NO_DEVICES: ChatDevices = { emulator: null, browser: null };
// The panel re-renders on every poll and on each optimistic edit; devices are asked about at most this often.
const MIN_REFRESH_MS: number = 1500;

// The header's Emulator and Browser pills: shown only while the chat's emulator window or Chrome tab is open.
// On the desktop each takes the user straight to it; on Orbit Web each copies the address a phone can open instead.
export class DeviceLinks {
  private readonly root: HTMLElement = requireElement('#sheet-devices');
  private readonly emulator: HTMLButtonElement = requireElement('#action-emulator');
  private readonly browser: HTMLButtonElement = requireElement('#action-browser');
  private sessionId: string | null = null;
  private requestedAt: number = 0;
  private pendingFor: string | null = null;
  private devices: ChatDevices = NO_DEVICES;

  constructor(private readonly report: StatusReport) {
    this.emulator.insertAdjacentHTML('afterbegin', ANDROID_ICON);
    this.browser.insertAdjacentHTML('afterbegin', BROWSER_ICON);
    this.emulator.addEventListener('click', (): void => this.press('emulator', (sessionId: string) => window.radar.focusChatEmulator(sessionId), EMULATOR_OUTCOMES));
    this.browser.addEventListener('click', (): void => this.press('browser', (sessionId: string) => window.radar.focusChatBrowser(sessionId), BROWSER_OUTCOMES));
  }

  // Called with the shown chat on every panel update; a different chat starts from no buttons at all.
  follow(sessionId: string): void {
    if (sessionId !== this.sessionId) {
      this.clear();
      this.sessionId = sessionId;
    }
    if (this.pendingFor === sessionId || Date.now() - this.requestedAt < MIN_REFRESH_MS) return;
    void this.refresh(sessionId);
  }

  clear(): void {
    this.sessionId = null;
    this.requestedAt = 0;
    this.show(NO_DEVICES);
  }

  private async refresh(sessionId: string): Promise<void> {
    this.pendingFor = sessionId;
    this.requestedAt = Date.now();
    try {
      const devices: ChatDevices = await window.radar.getChatDevices(sessionId).catch((): ChatDevices => NO_DEVICES);
      // The panel may have moved to another chat while this was asked.
      if (sessionId === this.sessionId) this.show(devices);
    } finally {
      if (this.pendingFor === sessionId) this.pendingFor = null;
    }
  }

  private show(devices: ChatDevices): void {
    this.devices = devices;
    this.emulator.hidden = devices.emulator === null;
    this.browser.hidden = devices.browser === null;
    this.root.hidden = devices.emulator === null && devices.browser === null;
    const isWeb: boolean = isWebHost();
    if (devices.emulator !== null) setTip(this.emulator, { title: isWeb ? "Copy the Metro address of this chat's emulator" : "Go to this chat's emulator", lines: emulatorLines(devices.emulator) });
    if (devices.browser !== null) setTip(this.browser, { title: isWeb ? "Copy the address of this chat's Chrome tab" : "Go to this chat's Chrome tab", lines: browserLines(devices.browser) });
  }

  // Copied from what the last poll found, inside the press itself: a phone refuses a copy that waits for an answer.
  private press(kind: CardDeviceKind, request: (sessionId: string) => Promise<DeviceFocus>, outcomes: FocusMessages): void {
    if (isWebHost()) copyDeviceAddress(kind, this.devices);
    else void this.focus(request, outcomes);
  }

  private async focus(request: (sessionId: string) => Promise<DeviceFocus>, outcomes: FocusMessages): Promise<void> {
    const sessionId: string | null = this.sessionId;
    if (sessionId === null) return;
    const outcome: DeviceFocus = await request(sessionId).catch((): DeviceFocus => 'missing');
    if (outcome === 'window' && outcomes.window !== null) this.report(outcomes.window, false);
    if (outcome !== 'missing') return;
    this.report(outcomes.missing, true);
    this.requestedAt = 0;
    this.follow(sessionId);
  }
}

interface FocusMessages {
  // Only a browser can end up half-way: its window in front without the tab.
  readonly window: string | null;
  readonly missing: string;
}

const EMULATOR_OUTCOMES: FocusMessages = {
  window: null,
  missing: "This chat's emulator is no longer open",
};

const BROWSER_OUTCOMES: FocusMessages = {
  window: "Chrome is in front, but this chat's tab may be behind another tab",
  missing: "This chat's Chrome tab is no longer open",
};

export function emulatorLines(emulator: EmulatorLink): string[] {
  return [emulator.label, ...(emulator.publicUrl === null ? [] : [emulator.publicUrl])];
}

export function browserLines(browser: BrowserLink): string[] {
  // A tab still loading reports its URL as its title; the line is shown once, and so is an address the tunnel keeps.
  const lines: string[] = [browser.title, browser.url, browser.publicUrl].filter((line: string | null): line is string => line !== null && line.length > 0);
  return [...new Set(lines)];
}
