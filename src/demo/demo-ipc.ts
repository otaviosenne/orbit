import { ipcMain } from 'electron';
import { IpcChannel } from '../shared/ipc-channels';
import { LISTENER_CHANNELS } from '../shared/ipc-routing';
import { registerRoutes } from '../main/routes/register-routes';
import { DEMO_ROUTES } from './demo-routes';

// Answers the renderer on the same channels as the real app, so the UI cannot tell the difference.
export function registerDemoIpcHandlers(): void {
  registerRoutes(DEMO_ROUTES);
  for (const channel of LISTENER_CHANNELS) ipcMain.on(IpcChannel[channel], (): void => undefined);
}
