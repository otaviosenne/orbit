import type { ChatRadar } from '../../core/chat-radar';
import type { BrowserTabReference, DeviceReferences } from '../../core/devices/device-references';
import type { DesktopWindow } from '../../core/devices/desktop-window';
import type { EmulatorWindow } from '../../core/devices/emulator-windows';
import { emulatorLabel, pickEmulatorWindow } from '../../core/devices/emulator-windows';
import type { BrowserLink, ChatDevices, DeviceFocus, EmulatorLink } from '../../shared/types';
import { BrowserLocator } from './browser-locator';
import { DesktopWindowList, focusWindowAt } from './desktop-windows';

export const NO_DEVICES: ChatDevices = { emulator: null, browser: null };

// Ties a chat's transcript to the emulator window and Chrome tab it worked with, and focuses them on request.
export class ChatDeviceService {
  private readonly windowList: DesktopWindowList = new DesktopWindowList();
  private readonly browser: BrowserLocator = new BrowserLocator(this.windowList);

  constructor(private readonly radar: ChatRadar) {}

  // Asked for the open chat only, on every poll: the transcript is re-read only when it changed.
  async devicesOf(sessionId: string): Promise<ChatDevices> {
    const references: DeviceReferences = await this.radar.deviceReferences(sessionId);
    if (references.emulators.length === 0 && references.browserTab === null) return NO_DEVICES;
    const windows: DesktopWindow[] = await this.windowList.recent();
    return { emulator: emulatorLink(references, windows), browser: await this.browserLink(references, windows) };
  }

  // Resolved again on click from a fresh window list: windows may have closed since the buttons were drawn.
  async focusEmulator(sessionId: string): Promise<DeviceFocus> {
    const references: DeviceReferences = await this.radar.deviceReferences(sessionId);
    const emulator: EmulatorWindow | null = pickEmulatorWindow(references.emulators, await this.windowList.fresh());
    if (emulator === null) return 'missing';
    await focusWindowAt(emulator.window.address);
    return 'exact';
  }

  async focusBrowser(sessionId: string): Promise<DeviceFocus> {
    const references: DeviceReferences = await this.radar.deviceReferences(sessionId);
    return references.browserTab === null ? 'missing' : this.browser.focus(references.browserTab);
  }

  private async browserLink(references: DeviceReferences, windows: readonly DesktopWindow[]): Promise<BrowserLink | null> {
    const tab: BrowserTabReference | null = references.browserTab;
    if (tab === null || !(await this.browser.mayBeOpen(tab, windows))) return null;
    return { title: tab.title, url: tab.url };
  }
}

function emulatorLink(references: DeviceReferences, windows: readonly DesktopWindow[]): EmulatorLink | null {
  const emulator: EmulatorWindow | null = pickEmulatorWindow(references.emulators, windows);
  return emulator === null ? null : { label: emulatorLabel(emulator) };
}
