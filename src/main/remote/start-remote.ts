import { app } from 'electron';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { RemoteConfigStore, remoteConfigDir } from './remote-config';
import type { RemoteRoutes } from './remote-context';
import { RemoteController } from './remote-controller';
import { registerRemoteSettingsHandlers } from './remote-ipc';

// build.mjs writes the web app next to main.js.
const WEB_ROOT: string = join(__dirname, 'web');

// demo: the demo keeps Orbit Web's config (and token) inside its own profile, away from the real one.
export async function startRemoteAccess(routes: RemoteRoutes, demo: boolean): Promise<RemoteController> {
  const dir: string = remoteConfigDir(process.env, homedir(), demo ? app.getPath('userData') : null);
  const controller: RemoteController = new RemoteController({
    store: new RemoteConfigStore(dir),
    routes,
    webRoot: WEB_ROOT,
    log: (line: string): void => console.log(line),
  });
  registerRemoteSettingsHandlers(controller);
  await controller.start();
  app.on('will-quit', (): void => void controller.stop());
  return controller;
}
