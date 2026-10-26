import type { ChatRadar } from '../../core/chat-radar';
import type { Route } from '../../shared/ipc-routing';
import { isSessionId } from '../../shared/session-id';
import type { ActionResult, ChatPermissions, ChatSettings, McpServerEntry, SkillEntry } from '../../shared/types';
import { openChatMcp, setChatEffort, setChatModel } from '../chat-actions';
import { readChatPermissions } from '../permissions/permission-reader';
import { switchPermissionMode } from '../permissions/permission-switcher';
import { isPid } from '../routes/route-args';
import { failure } from '../terminal-input';
import { listSkillsForChat } from './chat-skills';
import { listMcpServersForChat } from './chat-mcp';

type SettingsChannel = 'GetChatSettings' | 'ListSkills' | 'ListMcpServers' | 'OpenChatMcp' | 'SetChatModel' | 'SetChatEffort' | 'GetChatPermissions' | 'SetPermissionMode';

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
    SetChatModel: (pid: unknown, model: unknown): Promise<ActionResult> => (isPid(pid) ? setChatModel(pid, model) : Promise.resolve(NOT_A_CHAT)),
    SetChatEffort: (pid: unknown, effort: unknown): Promise<ActionResult> => (isPid(pid) ? setChatEffort(pid, effort) : Promise.resolve(NOT_A_CHAT)),
    GetChatPermissions: (sessionId: unknown): Promise<ChatPermissions> => readChatPermissions(radar, sessionId),
    SetPermissionMode: (sessionId: unknown, mode: unknown): Promise<ActionResult> => switchPermissionMode(sessionId, mode),
  };
}
