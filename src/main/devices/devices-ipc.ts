import type { Route } from '../../shared/ipc-routing';
import { isSessionId } from '../../shared/session-id';
import type { DeviceFocus } from '../../shared/types';
import { registerRoutes } from '../routes/register-routes';
import type { ChatDeviceService } from './chat-devices';
import { DesktopWindowList } from './desktop-windows';
import { EmulatorCloser } from './emulator-closer';

type DeviceChannel = 'FocusChatEmulator' | 'FocusChatBrowser' | 'ListOpenEmulators' | 'CloseAllEmulators';

// What the panel's Emulator and Browser pills and the board cards' device icons do on the desktop: they move its focus,
// so Orbit Web never reaches them (it copies the device's address instead, from GetChatDevices in read-routes.ts).
export function registerDeviceHandlers(devices: ChatDeviceService): void {
  registerRoutes(deviceRoutes(devices, new EmulatorCloser(new DesktopWindowList())));
}

// Session ids are searched for as file names, so anything else is refused.
function deviceRoutes(devices: ChatDeviceService, emulators: EmulatorCloser): Readonly<Record<DeviceChannel, Route>> {
  return {
    FocusChatEmulator: (sessionId: unknown): Promise<DeviceFocus> =>
      isSessionId(sessionId) ? devices.focusEmulator(sessionId) : Promise.resolve('missing'),
    FocusChatBrowser: (sessionId: unknown): Promise<DeviceFocus> =>
      isSessionId(sessionId) ? devices.focusBrowser(sessionId) : Promise.resolve('missing'),
    ListOpenEmulators: (): Promise<string[]> => emulators.labels(),
    CloseAllEmulators: (): Promise<number> => emulators.closeAll(),
  };
}
