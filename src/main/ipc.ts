import { ipcMain } from 'electron';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import type { ActionResult, DictationStart, TranscriptionResult } from '../shared/types';
import { IpcChannel } from '../shared/ipc-channels';
import { closeChat } from './chat-closer';
import { registerDeviceHandlers } from './devices/devices-ipc';
import type { ChatWindows } from './chat-windows';
import type { DictationService } from './dictation-service';
import { chooseFolder } from './folder-picker';
import { addShortcut } from './shortcut-actions';
import { focusTerminalOf } from './terminal-focus';
import { isPid } from './routes/route-args';
import { registerRoutes } from './routes/register-routes';
import type { RouteServices } from './routes/route-services';
import type { SharedRoutes } from './routes/shared-routes';
import { failure } from './terminal-input';

export interface RadarServices extends RouteServices {
  readonly dictation: DictationService;
  readonly chatWindows: ChatWindows;
}

// The shared routes answer every channel Orbit Web can also call; the rest below belong to the desktop window alone
// (see REMOTE_ACCESS in shared/remote-access.ts).
export function registerIpcHandlers({ radar, dictation, chatWindows }: RadarServices, routes: SharedRoutes): void {
  registerRoutes(routes);
  registerDesktopHandlers(chatWindows);
  registerDeviceHandlers(radar);
  registerDictationHandlers(dictation);
}

function registerDesktopHandlers(chatWindows: ChatWindows): void {
  ipcMain.handle(IpcChannel.AddShortcut, (_event: IpcMainInvokeEvent, draft: unknown): Promise<ActionResult> => addShortcut(draft));
  ipcMain.handle(IpcChannel.ChooseFolder, (event: IpcMainInvokeEvent): Promise<string | null> => chooseFolder(event.sender));
  ipcMain.handle(IpcChannel.FocusChat, (_event: IpcMainInvokeEvent, pid: unknown): Promise<void> =>
    isPid(pid) ? focusTerminalOf(pid) : Promise.resolve(),
  );
  ipcMain.handle(IpcChannel.CloseChat, (_event: IpcMainInvokeEvent, pid: unknown): Promise<ActionResult> =>
    isPid(pid) ? closeChat(pid) : Promise.resolve(failure('Not a chat')),
  );
  ipcMain.handle(IpcChannel.OpenChatWindow, (_event: IpcMainInvokeEvent, sessionId: unknown): void => {
    // The id ends up in a file URL, so anything but a real id is ignored.
    if (typeof sessionId === 'string' && sessionId.length > 0) chatWindows.open(sessionId);
  });
}

function registerDictationHandlers(dictation: DictationService): void {
  ipcMain.on(IpcChannel.DictationPrepare, (): void => dictation.prepare());
  ipcMain.handle(IpcChannel.DictationStart, (event: IpcMainInvokeEvent): Promise<DictationStart> =>
    dictation.begin((session: number, text: string): void => {
      if (!event.sender.isDestroyed()) event.sender.send(IpcChannel.DictationTranscript, { session, text });
    }),
  );
  ipcMain.on(IpcChannel.DictationAudio, (_event: IpcMainEvent, session: number, pcm: Uint8Array): void =>
    dictation.feed(session, pcm),
  );
  ipcMain.on(IpcChannel.DictationCancel, (_event: IpcMainEvent, session: number): void => dictation.cancel(session));
  ipcMain.handle(
    IpcChannel.DictationFinish,
    (_event: IpcMainInvokeEvent, session: number): Promise<TranscriptionResult> => dictation.finish(session),
  );
}
