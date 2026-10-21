import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { IpcChannel } from '../../shared/ipc-channels';
import type { ChannelKey, Route } from '../../shared/ipc-routing';

// Answers each channel of a route table over IPC, exactly as Orbit Web's server answers it over HTTP.
export function registerRoutes(routes: Readonly<Partial<Record<ChannelKey, Route>>>): void {
  for (const [channel, route] of Object.entries(routes) as [ChannelKey, Route][]) {
    ipcMain.handle(IpcChannel[channel], (_event: IpcMainInvokeEvent, ...args: unknown[]): unknown => route(...args));
  }
}
