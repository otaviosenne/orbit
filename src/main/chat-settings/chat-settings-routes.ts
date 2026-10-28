import type { ChatRadar } from '../../core/chat-radar';
import type { Route } from '../../shared/ipc-routing';
import { isSessionId } from '../../shared/session-id';
import type { ActionResult, ChatPermissions, ChatSettings, McpServerEntry, SettingResult, SkillEntry } from '../../shared/types';
import { openChatMcp, setChatEffort, setChatModel } from '../chat-actions';
import { readChatPermissions } from '../permissions/permission-reader';
import { switchPermissionMode } from '../permissions/permission-switcher';
import { isPid } from '../routes/route-args';
import { failure } from '../terminal-input';
import { listSkillsForChat } from './chat-skills';
import { listMcpServersForChat } from './chat-mcp';
import { answerSwitchDialog, withSwitchDialog } from './switch-confirmation';

type SettingsChannel = 'GetChatSettings' | 'ListSkills' | 'ListMcpServers' | 'OpenChatMcp' | 'SetChatModel' | 'SetChatEffort' | 'AnswerSettingSwitch' | 'GetChatPermissions' | 'SetPermissionMode';

const UNKNOWN_SETTINGS: ChatSettings = { model: null, effort: null };
const NOT_A_CHAT: ActionResult = failure('Not a chat');

// The chat panel's settings popover: what the chat runs on, how to change it, and which skills it can run.
export function chatSettingsRoutes(radar: ChatRadar): Readonly<Record<SettingsChannel, Route>> {
  return {
    GetChatSettings: (sessionId: unknown): Promise<ChatSettings> =>
      // The id is searched for as a file name, so anything but a real session id is refused.
      isSessionId(sessionId) ? radar.settings(sessionId) : Promise.resolve(UNKNOWN_SETTINGS),
    ListMcpServers: (sessionId: unknown): Promise<McpServerEntry[]> => listMcpServersForChat(sessionId),
    OpenChatMcp: (pid: unknown): Promise<ActionResult> => (isPid(pid) ? openChatMcp(pid) : Promise.resolve(NOT_A_CHAT)),
    ListSkills: (sessionId: unknown): Promise<SkillEntry[]> => listSkillsForChat(sessionId),
    SetChatModel: async (pid: unknown, model: unknown): Promise<SettingResult> =>
      isPid(pid) ? withSwitchDialog(pid, await setChatModel(pid, model)) : { ...NOT_A_CHAT, confirm: null },
    SetChatEffort: async (pid: unknown, effort: unknown): Promise<SettingResult> =>
      isPid(pid) ? withSwitchDialog(pid, await setChatEffort(pid, effort)) : { ...NOT_A_CHAT, confirm: null },
    AnswerSettingSwitch: (pid: unknown, accept: unknown): Promise<ActionResult> =>
      isPid(pid) && typeof accept === 'boolean' ? answerSwitchDialog(pid, accept) : Promise.resolve(NOT_A_CHAT),
    GetChatPermissions: (sessionId: unknown): Promise<ChatPermissions> => readChatPermissions(radar, sessionId),
    SetPermissionMode: (sessionId: unknown, mode: unknown): Promise<ActionResult> => switchPermissionMode(sessionId, mode),
  };
}
