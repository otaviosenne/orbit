import type { ChatRadar } from '../../core/chat-radar';
import type { Route } from '../../shared/ipc-routing';
import { isSessionId } from '../../shared/session-id';
import type { ChatDevices, DeviceFocus } from '../../shared/types';
import { registerRoutes } from '../routes/register-routes';
import { ChatDeviceService, NO_DEVICES } from './chat-devices';

type DeviceChannel = 'GetChatDevices' | 'FocusChatEmulator' | 'FocusChatBrowser';

// The panel's Emulator and Browser pills and the board cards' device icons; desktop only, since they move the desktop's focus.
export function registerDeviceHandlers(radar: ChatRadar): void {
  registerRoutes(deviceRoutes(new ChatDeviceService(radar)));
}

// Session ids are searched for as file names, so anything else is refused.
function deviceRoutes(devices: ChatDeviceService): Readonly<Record<DeviceChannel, Route>> {
  return {
    GetChatDevices: (sessionId: unknown): Promise<ChatDevices> =>
      isSessionId(sessionId) ? devices.devicesOf(sessionId) : Promise.resolve(NO_DEVICES),
    FocusChatEmulator: (sessionId: unknown): Promise<DeviceFocus> =>
      isSessionId(sessionId) ? devices.focusEmulator(sessionId) : Promise.resolve('missing'),
    FocusChatBrowser: (sessionId: unknown): Promise<DeviceFocus> =>
      isSessionId(sessionId) ? devices.focusBrowser(sessionId) : Promise.resolve('missing'),
  };
}
