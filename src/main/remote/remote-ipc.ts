import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { IpcChannel } from '../../shared/ipc-channels';
import type { RemoteSettings } from '../../shared/remote-settings';
import type { RemoteController } from './remote-controller';

// Settings' Orbit Web section. Only the desktop window reaches these: they are never routes, so never remote.
export function registerRemoteSettingsHandlers(controller: RemoteController): void {
  ipcMain.handle(IpcChannel.GetRemoteSettings, (): RemoteSettings => controller.settings());
  ipcMain.handle(IpcChannel.SetRemoteEnabled, (_event: IpcMainInvokeEvent, enabled: unknown): Promise<RemoteSettings> =>
    controller.setEnabled(enabled),
  );
  ipcMain.handle(IpcChannel.SetRemoteExternalUrl, (_event: IpcMainInvokeEvent, url: unknown): Promise<RemoteSettings> =>
    controller.setExternalUrl(url),
  );
  ipcMain.handle(IpcChannel.RegenerateRemoteToken, (): Promise<RemoteSettings> => controller.regenerateToken());
}
