import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { ChatRadar } from '../../core/chat-radar';
import { IpcChannel } from '../../shared/ipc-channels';
import { isSessionId } from '../../shared/session-id';
import type { ActionResult, ChatPermissions, ChatSettings, SkillEntry } from '../../shared/types';
import { setChatEffort, setChatModel } from '../chat-actions';
import { readChatPermissions } from '../permissions/permission-reader';
import { switchPermissionMode } from '../permissions/permission-switcher';
import { listSkillsForChat } from './chat-skills';

const UNKNOWN_SETTINGS: ChatSettings = { model: null, effort: null };

// The chat panel's settings popover: what the chat runs on, how to change it, and which skills it can run.
export function registerChatSettingsHandlers(radar: ChatRadar): void {
  ipcMain.handle(IpcChannel.GetChatSettings, (_event: IpcMainInvokeEvent, sessionId: unknown): Promise<ChatSettings> =>
    // The id is searched for as a file name, so anything but a real session id is refused.
    isSessionId(sessionId) ? radar.settings(sessionId) : Promise.resolve(UNKNOWN_SETTINGS),
  );
  ipcMain.handle(IpcChannel.ListSkills, (_event: IpcMainInvokeEvent, sessionId: unknown): Promise<SkillEntry[]> => listSkillsForChat(sessionId));
  ipcMain.handle(
    IpcChannel.SetChatModel,
    (_event: IpcMainInvokeEvent, pid: number, model: unknown): Promise<ActionResult> => setChatModel(pid, model),
  );
  ipcMain.handle(
    IpcChannel.SetChatEffort,
    (_event: IpcMainInvokeEvent, pid: number, effort: unknown): Promise<ActionResult> => setChatEffort(pid, effort),
  );
  ipcMain.handle(IpcChannel.GetChatPermissions, (_event: IpcMainInvokeEvent, sessionId: unknown): Promise<ChatPermissions> =>
    readChatPermissions(radar, sessionId),
  );
  ipcMain.handle(
    IpcChannel.SetPermissionMode,
    (_event: IpcMainInvokeEvent, sessionId: unknown, mode: unknown): Promise<ActionResult> => switchPermissionMode(sessionId, mode),
  );
}
