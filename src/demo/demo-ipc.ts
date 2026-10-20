import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { IpcChannel } from '../shared/ipc-channels';
import type { DemoRoute, InvokeChannel } from './demo-routes';
import { DEMO_ROUTES, LISTENER_CHANNELS } from './demo-routes';

// Answers the renderer on the same channels as the real app, so the UI cannot tell the difference.
export function registerDemoIpcHandlers(): void {
  for (const [channel, route] of Object.entries(DEMO_ROUTES) as [InvokeChannel, DemoRoute][]) {
    ipcMain.handle(IpcChannel[channel], (_event: IpcMainInvokeEvent, ...args: unknown[]): unknown => route(...args));
  }
  for (const channel of LISTENER_CHANNELS) ipcMain.on(IpcChannel[channel], (): void => undefined);
}
