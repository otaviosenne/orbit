import { describe, expect, it, vi } from 'vitest';

// Every channel the app answers, in the order registered; Electron itself throws on a second handler.
const registered: string[] = vi.hoisted((): string[] => []);

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string): void => void registered.push(channel),
    on: (channel: string): void => void registered.push(channel),
  },
  app: { on: (): void => undefined, getPath: (): string => '/tmp' },
  BrowserWindow: class {},
  dialog: {},
  shell: {},
}));

import { registerIpcHandlers } from '../../src/main/ipc';
import type { RadarServices } from '../../src/main/ipc';
import { registerRemoteSettingsHandlers } from '../../src/main/remote/remote-ipc';
import type { RemoteController } from '../../src/main/remote/remote-controller';
import { buildSharedRoutes } from '../../src/main/routes/shared-routes';
import { IpcChannel } from '../../src/shared/ipc-channels';
import { PUSH_CHANNELS } from '../../src/shared/ipc-routing';

describe('real app IPC wiring', () => {
  it('answers every channel the renderer can call, each exactly once', () => {
    const services: RadarServices = { radar: {}, usage: {}, dictation: {}, chatWindows: {}, pastChats: {}, timelineHistory: {} } as unknown as RadarServices;
    registerIpcHandlers(services, buildSharedRoutes(services));
    registerRemoteSettingsHandlers({} as RemoteController);
    const expected: string[] = Object.entries(IpcChannel)
      .filter(([key]) => !(PUSH_CHANNELS as readonly string[]).includes(key))
      .map(([, channel]) => channel);
    expect([...registered].sort()).toEqual([...expected].sort());
  });
});
