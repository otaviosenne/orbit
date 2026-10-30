import type { BoardState } from '../shared/board-state';
import { contextBridge, ipcRenderer } from 'electron';
import type { ChatColor } from '../shared/chat-colors';
import type { EffortLevel, ModelChoice } from '../shared/chat-settings';
import type { CycledPermissionMode } from '../shared/permission-modes';
import type { RemoteSettings } from '../shared/remote-settings';
import type { ResourceSnapshot } from '../shared/chat-resources';
import { IpcChannel } from '../shared/ipc-channels';
import type { IpcRendererEvent } from 'electron';
import type {
  ActionResult,
  SettingResult,
  PauseReport,
  PauseTarget,
  AttachmentBlob,
  AttachmentUpload,
  ChatPermissions,
  ChatSettings,
  ChatDevices,
  ChatSnapshot,
  ClosedChatActivity,
  DeviceFocus,
  DictationStart,
  DictationTranscript,
  LauncherEntry,
  PastChat,
  QuestionAnswer,
  QuestionPicker,
  ShellOutput,
  RadarApi,
  ShortcutDraft,
  McpServerEntry,
  SkillEntry,
  TranscriptionResult,
  TranscriptItem,
  TurnProgress,
  UsageSnapshot,
} from '../shared/types';

const api: RadarApi = {
  getImage: (sessionId: string, key: string): Promise<string | null> => ipcRenderer.invoke(IpcChannel.GetImage, sessionId, key),
  getAttachment: (path: string): Promise<AttachmentBlob | null> => ipcRenderer.invoke(IpcChannel.GetAttachment, path),
  revealFile: (path: string): Promise<void> => ipcRenderer.invoke(IpcChannel.RevealFile, path),
  notifyNeedsYou: (sessionId: string, chatName: string): Promise<void> => ipcRenderer.invoke(IpcChannel.NotifyNeedsYou, sessionId, chatName),
  onOpenChatRequest: (listener: (sessionId: string) => void): void => {
    ipcRenderer.on(IpcChannel.OpenChatRequest, (_event: IpcRendererEvent, sessionId: string): void => listener(sessionId));
  },
  getTurnProgress: (sessionId: string): Promise<TurnProgress | null> => ipcRenderer.invoke(IpcChannel.GetTurnProgress, sessionId),
  getChatColor: (sessionId: string): Promise<string | null> => ipcRenderer.invoke(IpcChannel.GetChatColor, sessionId),
  listLaunchers: (): Promise<LauncherEntry[]> => ipcRenderer.invoke(IpcChannel.ListLaunchers),
  openLauncher: (name: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.OpenLauncher, name),
  addShortcut: (draft: ShortcutDraft): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.AddShortcut, draft),
  chooseFolder: (): Promise<string | null> => ipcRenderer.invoke(IpcChannel.ChooseFolder),
  listPastChats: (): Promise<PastChat[]> => ipcRenderer.invoke(IpcChannel.ListPastChats),
  getTimelineHistory: (sinceMs: number): Promise<ClosedChatActivity[]> => ipcRenderer.invoke(IpcChannel.GetTimelineHistory, sinceMs),
  openSignIn: (): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.OpenSignIn),
  resumeChat: (sessionId: string, afterCut?: boolean): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.ResumeChat, sessionId, afterCut === true),
  prepareDictation: (): void => ipcRenderer.send(IpcChannel.DictationPrepare),
  startDictation: (): Promise<DictationStart> => ipcRenderer.invoke(IpcChannel.DictationStart),
  feedDictation: (session: number, pcm: Uint8Array): void => ipcRenderer.send(IpcChannel.DictationAudio, session, pcm),
  finishDictation: (session: number): Promise<TranscriptionResult> => ipcRenderer.invoke(IpcChannel.DictationFinish, session),
  cancelDictation: (session: number): void => ipcRenderer.send(IpcChannel.DictationCancel, session),
  onDictationTranscript: (listener: (transcript: DictationTranscript) => void): void => {
    ipcRenderer.on(IpcChannel.DictationTranscript, (_event: IpcRendererEvent, transcript: DictationTranscript): void =>
      listener(transcript),
    );
  },
  getChats: (): Promise<ChatSnapshot[]> => ipcRenderer.invoke(IpcChannel.GetChats),
  getTranscript: (sessionId: string, limit?: number): Promise<TranscriptItem[]> => ipcRenderer.invoke(IpcChannel.GetTranscript, sessionId, limit),
  getAgentTranscript: (sessionId: string, agentId: string, limit?: number): Promise<TranscriptItem[]> =>
    ipcRenderer.invoke(IpcChannel.GetAgentTranscript, sessionId, agentId, limit),
  getUsage: (): Promise<UsageSnapshot> => ipcRenderer.invoke(IpcChannel.GetUsage),
  focusChat: (pid: number): Promise<void> => ipcRenderer.invoke(IpcChannel.FocusChat, pid),
  renameChat: (pid: number, name: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.RenameChat, pid, name),
  recolorChat: (pid: number, color: ChatColor): Promise<ActionResult> =>
    ipcRenderer.invoke(IpcChannel.RecolorChat, pid, color),
  sendMessage: (pid: number, text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult> =>
    ipcRenderer.invoke(IpcChannel.SendMessage, pid, text, attachments),
  closeChat: (pid: number): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.CloseChat, pid),
  interruptChat: (pid: number): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.InterruptChat, pid),
  pauseChats: (targets: readonly PauseTarget[]): Promise<PauseReport> => ipcRenderer.invoke(IpcChannel.PauseChats, targets),
  continueChats: (pids: readonly number[]): Promise<PauseReport> => ipcRenderer.invoke(IpcChannel.ContinueChats, pids),
  openChatWindow: (sessionId: string): Promise<void> => ipcRenderer.invoke(IpcChannel.OpenChatWindow, sessionId),
  getQuestionPicker: (sessionId: string): Promise<QuestionPicker | null> => ipcRenderer.invoke(IpcChannel.GetQuestionPicker, sessionId),
  answerQuestion: (sessionId: string, fingerprint: string, answer: QuestionAnswer): Promise<ActionResult> =>
    ipcRenderer.invoke(IpcChannel.AnswerQuestion, sessionId, fingerprint, answer),
  submitAnswers: (sessionId: string, fingerprint: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.SubmitAnswers, sessionId, fingerprint),
  answerQuestionSet: (sessionId: string, questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult> =>
    ipcRenderer.invoke(IpcChannel.AnswerQuestionSet, sessionId, questionId, answers),
  declineQuestion: (sessionId: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.DeclineQuestion, sessionId),
  stopAgent: (sessionId: string, agentId: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.StopAgent, sessionId, agentId),
  getShellOutput: (sessionId: string, taskId: string): Promise<ShellOutput | null> => ipcRenderer.invoke(IpcChannel.GetShellOutput, sessionId, taskId),
  interruptShell: (sessionId: string, taskId: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.InterruptShell, sessionId, taskId),
  getChatSettings: (sessionId: string): Promise<ChatSettings> => ipcRenderer.invoke(IpcChannel.GetChatSettings, sessionId),
  listMcpServers: (sessionId: string): Promise<McpServerEntry[]> => ipcRenderer.invoke(IpcChannel.ListMcpServers, sessionId),
  openChatMcp: (pid: number): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.OpenChatMcp, pid),
  listSkills: (sessionId: string): Promise<SkillEntry[]> => ipcRenderer.invoke(IpcChannel.ListSkills, sessionId),
  setChatModel: (pid: number, model: ModelChoice): Promise<SettingResult> => ipcRenderer.invoke(IpcChannel.SetChatModel, pid, model),
  setChatEffort: (pid: number, effort: EffortLevel): Promise<SettingResult> => ipcRenderer.invoke(IpcChannel.SetChatEffort, pid, effort),
  answerSettingSwitch: (pid: number, accept: boolean): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.AnswerSettingSwitch, pid, accept),
  getChatPermissions: (sessionId: string): Promise<ChatPermissions> => ipcRenderer.invoke(IpcChannel.GetChatPermissions, sessionId),
  setPermissionMode: (sessionId: string, mode: CycledPermissionMode): Promise<ActionResult> =>
    ipcRenderer.invoke(IpcChannel.SetPermissionMode, sessionId, mode),
  getChatDevices: (sessionId: string): Promise<ChatDevices> => ipcRenderer.invoke(IpcChannel.GetChatDevices, sessionId),
  focusChatEmulator: (sessionId: string): Promise<DeviceFocus> => ipcRenderer.invoke(IpcChannel.FocusChatEmulator, sessionId),
  listOpenEmulators: (): Promise<string[]> => ipcRenderer.invoke(IpcChannel.ListOpenEmulators),
  closeAllEmulators: (): Promise<number> => ipcRenderer.invoke(IpcChannel.CloseAllEmulators),
  focusChatBrowser: (sessionId: string): Promise<DeviceFocus> => ipcRenderer.invoke(IpcChannel.FocusChatBrowser, sessionId),
  getChatResources: (): Promise<ResourceSnapshot> => ipcRenderer.invoke(IpcChannel.GetChatResources),
  getBoardState: (knownVersion: number | null): Promise<BoardState | null> => ipcRenderer.invoke(IpcChannel.GetBoardState, knownVersion),
  setBoardState: (key: string, value: string): Promise<ActionResult> => ipcRenderer.invoke(IpcChannel.SetBoardState, key, value),
  getRemoteSettings: (): Promise<RemoteSettings> => ipcRenderer.invoke(IpcChannel.GetRemoteSettings),
  setRemoteEnabled: (enabled: boolean): Promise<RemoteSettings> => ipcRenderer.invoke(IpcChannel.SetRemoteEnabled, enabled),
  setRemoteExternalUrl: (url: string): Promise<RemoteSettings> => ipcRenderer.invoke(IpcChannel.SetRemoteExternalUrl, url),
  setRemotePort: (port: string): Promise<RemoteSettings> => ipcRenderer.invoke(IpcChannel.SetRemotePort, port),
  regenerateRemoteToken: (): Promise<RemoteSettings> => ipcRenderer.invoke(IpcChannel.RegenerateRemoteToken),
};

contextBridge.exposeInMainWorld('radar', api);
