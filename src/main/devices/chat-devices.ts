import type { ChatRadar } from '../../core/chat-radar';
import type { BrowserTabReference, DeviceReferences } from '../../core/devices/device-references';
import type { DesktopWindow } from '../../core/devices/desktop-window';
import type { EmulatorWindow } from '../../core/devices/emulator-windows';
import { emulatorLabel, pickEmulatorWindow } from '../../core/devices/emulator-windows';
import { metroAppName } from '../../core/devices/metro-app-name';
import type { MetroServer } from '../../core/devices/metro-port';
import { publicUrlOf } from '../../core/devices/public-url';
import type { TunnelHosts } from '../../core/devices/tunnel-hosts';
import type { ChatServer } from '../../core/devices/dev-servers';
import type { BrowserLink, ChatDevices, DeviceFocus, EmulatorLink, ServerLink } from '../../shared/types';
import { BrowserLocator } from './browser-locator';
import { DesktopWindowList, focusWindowAt } from './desktop-windows';
import { ListeningSocketReader } from './listening-socket-reader';
import { MetroLocator } from './metro-locator';
import { ServerLocator } from './server-locator';
import { TunnelHostReader } from './tunnel-host-reader';

export const NO_DEVICES: ChatDevices = { emulator: null, browser: null, servers: [] };

// Ties a chat's transcript to the emulator window and Chrome tab it worked with, focuses them on request, and gives
// the addresses Orbit Web copies for them.
export class ChatDeviceService {
  private readonly windowList: DesktopWindowList = new DesktopWindowList();
  private readonly browser: BrowserLocator = new BrowserLocator(this.windowList);
  private readonly sockets: ListeningSocketReader = new ListeningSocketReader();
  private readonly metro: MetroLocator = new MetroLocator(this.sockets);
  private readonly servers: ServerLocator = new ServerLocator(this.sockets);
  private readonly tunnel: TunnelHostReader = new TunnelHostReader();

  constructor(private readonly radar: ChatRadar) {}

  // Asked for the open chat and for every card on the board, on each poll: the transcript is re-read only when it changed.
  async devicesOf(sessionId: string): Promise<ChatDevices> {
    const [references, hosts]: [DeviceReferences, TunnelHosts] = await Promise.all([this.radar.deviceReferences(sessionId), this.tunnel.hosts()]);
    const servers: ServerLink[] = (await this.servers.serversOf(sessionId)).map((server: ChatServer): ServerLink => ({ ...server, publicUrl: hosts.get(server.port) ?? null }));
    if (references.emulators.length === 0 && references.browserTab === null) return { ...NO_DEVICES, servers };
    const windows: DesktopWindow[] = await this.windowList.recent();
    const [emulator, browser]: [EmulatorLink | null, BrowserLink | null] = await Promise.all([
      this.emulatorLink(sessionId, references, windows, hosts),
      this.browserLink(references, windows, hosts),
    ]);
    return { emulator, browser, servers };
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

  private async emulatorLink(sessionId: string, references: DeviceReferences, windows: readonly DesktopWindow[], hosts: TunnelHosts): Promise<EmulatorLink | null> {
    const emulator: EmulatorWindow | null = pickEmulatorWindow(references.emulators, windows);
    if (emulator === null) return null;
    const metro: MetroServer | null = await this.metro.serverOf(sessionId, emulator.port);
    if (metro === null) return { label: emulatorLabel(emulator), metroPort: null, metroApp: null, publicUrl: null };
    return { label: emulatorLabel(emulator), metroPort: metro.port, metroApp: metroAppName(metro.folder), publicUrl: hosts.get(metro.port) ?? null };
  }

  private async browserLink(references: DeviceReferences, windows: readonly DesktopWindow[], hosts: TunnelHosts): Promise<BrowserLink | null> {
    const tab: BrowserTabReference | null = references.browserTab;
    if (tab === null || !(await this.browser.mayBeOpen(tab, windows))) return null;
    return { title: tab.title, url: tab.url, publicUrl: publicUrlOf(tab.url, hosts) };
  }
}
