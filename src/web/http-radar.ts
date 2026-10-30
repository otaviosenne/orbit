import type { BoardState } from '../shared/board-state';
import type { ChatColor } from '../shared/chat-colors';
import type { EffortLevel, ModelChoice } from '../shared/chat-settings';
import type { CycledPermissionMode } from '../shared/permission-modes';
import type { RemoteSettings } from '../shared/remote-settings';
import type { ResourceSnapshot } from '../shared/chat-resources';
import type {
  ActionResult,
  SettingResult,
  PauseReport,
  PauseTarget,
  AttachmentBlob,
  AttachmentUpload,
  ChatDevices,
  ChatPermissions,
  ChatSettings,
  ChatSnapshot,
  ClosedChatActivity,
  DeviceFocus,
  DictationStart,
  DictationTranscript,
  LauncherEntry,
  PastChat,
  QuestionAnswer,
  QuestionPicker,
  RadarApi,
  ShellOutput,
  ShortcutDraft,
  McpServerEntry,
  SkillEntry,
  TranscriptionResult,
  TranscriptItem,
  TurnProgress,
  UsageSnapshot,
} from '../shared/types';
import type { RemoteDictation } from './dictation/remote-dictation';
import type { RemoteCall } from './remote-caller';

const DESKTOP_ONLY: string = 'Only available in the desktop app';
const DESKTOP_ONLY_RESULT: ActionResult = { ok: false, method: null, error: DESKTOP_ONLY };
const NO_DEVICES: ChatDevices = { emulator: null, browser: null };

// The dictation steps window.radar needs; RemoteDictation carries them over Orbit Web's dictation socket.
export type RemoteVoice = Pick<RemoteDictation, 'prepare' | 'start' | 'feed' | 'finish' | 'cancel' | 'onTranscript'>;

// window.radar for Orbit Web: the same RadarApi the desktop window gets from its preload, over HTTP (dictation over
// its own WebSocket). What is desktop-only (REMOTE_ACCESS) answers locally as unavailable, and the UI hides its buttons.
export function createHttpRadar(call: RemoteCall, voice: RemoteVoice): RadarApi {
  return {
    getImage: (sessionId: string, key: string): Promise<string | null> => call('GetImage', [sessionId, key]),
    getAttachment: (path: string): Promise<AttachmentBlob | null> => call('GetAttachment', [path]),
    // The file manager is on the desktop; the web shows the path to copy instead.
    revealFile: (): Promise<void> => Promise.resolve(),
    // Notifications belong to the desktop app; a browser asks for none.
    notifyNeedsYou: (): Promise<void> => Promise.resolve(),
    onOpenChatRequest: (): void => undefined,
    getTurnProgress: (sessionId: string): Promise<TurnProgress | null> => call('GetTurnProgress', [sessionId]),
    getChatColor: (sessionId: string): Promise<string | null> => call('GetChatColor', [sessionId]),
    listLaunchers: (): Promise<LauncherEntry[]> => call('ListLaunchers', []),
    openLauncher: (name: string): Promise<ActionResult> => call('OpenLauncher', [name]),
    addShortcut: (_draft: ShortcutDraft): Promise<ActionResult> => Promise.resolve(DESKTOP_ONLY_RESULT),
    chooseFolder: (): Promise<string | null> => Promise.resolve(null),
    listPastChats: (): Promise<PastChat[]> => call('ListPastChats', []),
    getTimelineHistory: (sinceMs: number): Promise<ClosedChatActivity[]> => call('GetTimelineHistory', [sinceMs]),
    openSignIn: (): Promise<ActionResult> => Promise.resolve({ ok: false, method: null, error: 'Sign in from the computer running Orbit' }),
    resumeChat: (sessionId: string, afterCut?: boolean): Promise<ActionResult> => call('ResumeChat', [sessionId, afterCut === true]),
    prepareDictation: (): void => voice.prepare(),
    startDictation: (): Promise<DictationStart> => voice.start(),
    feedDictation: (session: number, pcm: Uint8Array): void => voice.feed(session, pcm),
    finishDictation: (session: number): Promise<TranscriptionResult> => voice.finish(session),
    cancelDictation: (session: number): void => voice.cancel(session),
    onDictationTranscript: (listener: (transcript: DictationTranscript) => void): void => voice.onTranscript(listener),
    getChats: (): Promise<ChatSnapshot[]> => call('GetChats', []),
    // JSON turns a missing argument into null, which the route reads as "the usual amount".
    getTranscript: (sessionId: string, limit?: number): Promise<TranscriptItem[]> => call('GetTranscript', [sessionId, limit ?? null]),
    getAgentTranscript: (sessionId: string, agentId: string, limit?: number): Promise<TranscriptItem[]> =>
      call('GetAgentTranscript', [sessionId, agentId, limit ?? null]),
    getUsage: (): Promise<UsageSnapshot> => call('GetUsage', []),
    focusChat: (pid: number): Promise<void> => call('FocusChat', [pid]),
    renameChat: (pid: number, name: string): Promise<ActionResult> => call('RenameChat', [pid, name]),
    recolorChat: (pid: number, color: ChatColor): Promise<ActionResult> => call('RecolorChat', [pid, color]),
    sendMessage: (pid: number, text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult> =>
      call('SendMessage', [pid, text, attachments]),
    closeChat: (pid: number): Promise<ActionResult> => call('CloseChat', [pid]),
    interruptChat: (pid: number): Promise<ActionResult> => call('InterruptChat', [pid]),
    pauseChats: (targets: readonly PauseTarget[]): Promise<PauseReport> => call('PauseChats', [targets]),
    continueChats: (pids: readonly number[]): Promise<PauseReport> => call('ContinueChats', [pids]),
    openChatWindow: (sessionId: string): Promise<void> => call('OpenChatWindow', [sessionId]),
    getQuestionPicker: (sessionId: string): Promise<QuestionPicker | null> => call('GetQuestionPicker', [sessionId]),
    answerQuestion: (sessionId: string, fingerprint: string, answer: QuestionAnswer): Promise<ActionResult> =>
      call('AnswerQuestion', [sessionId, fingerprint, answer]),
    submitAnswers: (sessionId: string, fingerprint: string): Promise<ActionResult> => call('SubmitAnswers', [sessionId, fingerprint]),
    answerQuestionSet: (sessionId: string, questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult> =>
      call('AnswerQuestionSet', [sessionId, questionId, answers]),
    declineQuestion: (sessionId: string): Promise<ActionResult> => call('DeclineQuestion', [sessionId]),
    stopAgent: (sessionId: string, agentId: string): Promise<ActionResult> => call('StopAgent', [sessionId, agentId]),
    getShellOutput: (sessionId: string, taskId: string): Promise<ShellOutput | null> => call('GetShellOutput', [sessionId, taskId]),
    interruptShell: (sessionId: string, taskId: string): Promise<ActionResult> => call('InterruptShell', [sessionId, taskId]),
    getChatSettings: (sessionId: string): Promise<ChatSettings> => call('GetChatSettings', [sessionId]),
    listMcpServers: (sessionId: string): Promise<McpServerEntry[]> => call('ListMcpServers', [sessionId]),
    openChatMcp: (pid: number): Promise<ActionResult> => call('OpenChatMcp', [pid]),
    listSkills: (sessionId: string): Promise<SkillEntry[]> => call('ListSkills', [sessionId]),
    setChatModel: (pid: number, model: ModelChoice): Promise<SettingResult> => call('SetChatModel', [pid, model]),
    setChatEffort: (pid: number, effort: EffortLevel): Promise<SettingResult> => call('SetChatEffort', [pid, effort]),
    answerSettingSwitch: (pid: number, accept: boolean): Promise<ActionResult> => call('AnswerSettingSwitch', [pid, accept]),
    getChatPermissions: (sessionId: string): Promise<ChatPermissions> => call('GetChatPermissions', [sessionId]),
    setPermissionMode: (sessionId: string, mode: CycledPermissionMode): Promise<ActionResult> => call('SetPermissionMode', [sessionId, mode]),
    // No device buttons on the web: they focus windows on the desktop.
    getChatDevices: (): Promise<ChatDevices> => Promise.resolve(NO_DEVICES),
    focusChatEmulator: (): Promise<DeviceFocus> => Promise.resolve('missing'),
    listOpenEmulators: (): Promise<string[]> => Promise.resolve([]),
    closeAllEmulators: (): Promise<number> => Promise.resolve(0),
    focusChatBrowser: (): Promise<DeviceFocus> => Promise.resolve('missing'),
    getChatResources: (): Promise<ResourceSnapshot> => call('GetChatResources', []),
    getBoardState: (knownVersion: number | null): Promise<BoardState | null> => call('GetBoardState', [knownVersion]),
    setBoardState: (key: string, value: string): Promise<ActionResult> => call('SetBoardState', [key, value]),
    getRemoteSettings: (): Promise<RemoteSettings> => desktopOnly(),
    setRemoteEnabled: (): Promise<RemoteSettings> => desktopOnly(),
    setRemoteExternalUrl: (): Promise<RemoteSettings> => desktopOnly(),
    setRemotePort: (): Promise<RemoteSettings> => desktopOnly(),
    regenerateRemoteToken: (): Promise<RemoteSettings> => desktopOnly(),
  };
}

// A phone must never read or change Orbit Web's own token; the desktop window alone holds these.
function desktopOnly(): Promise<RemoteSettings> {
  return Promise.reject(new Error(DESKTOP_ONLY));
}
