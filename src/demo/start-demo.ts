import { app } from 'electron';
import { join } from 'node:path';
import { createRadarWindow } from '../main/window';
import { startRemoteAccess } from '../main/remote/start-remote';
import { registerDemoIpcHandlers } from './demo-ipc';
import { DEMO_ROUTES } from './demo-routes';

const USER_DATA_SWITCH: string = 'user-data-dir';
const DEMO_PROFILE_DIR: string = 'orbit-demo';

// Never claims the single-instance lock (that makes a running Orbit quit) and never shares the real profile,
// so the demo cannot disturb the user's own pins, drafts or theme.
export async function startDemo(): Promise<void> {
  if (!app.commandLine.hasSwitch(USER_DATA_SWITCH)) app.setPath('userData', join(app.getPath('appData'), DEMO_PROFILE_DIR));
  await app.whenReady();
  registerDemoIpcHandlers();
  // Orbit Web serves the same made-up data, so the web app can be shown without real chats.
  await startRemoteAccess(DEMO_ROUTES, true);
  createRadarWindow();
}
