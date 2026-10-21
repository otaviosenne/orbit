import type { ChatColor } from '../shared/chat-colors';
import type { EffortLevel, ModelChoice } from '../shared/chat-settings';
import type { CycledPermissionMode } from '../shared/permission-modes';
import type { RemoteSettings } from '../shared/remote-settings';
import type { ResourceSnapshot } from '../shared/chat-resources';
import type {
  ActionResult,
  AttachmentUpload,
  ChatDevices,
  ChatPermissions,
  ChatSettings,
  ChatSnapshot,
  ClosedChatActivity,
  DeviceFocus,
  DictationStart,
  LauncherEntry,
  PastChat,
  QuestionAnswer,
  QuestionPicker,
  RadarApi,
  ShellOutput,
  ShortcutDraft,
  SkillEntry,
  TranscriptionResult,
  TranscriptItem,
  TurnProgress,
  UsageSnapshot,
} from '../shared/types';
import type { RemoteCall } from './remote-caller';

const DESKTOP_ONLY: string = 'Only available in the desktop app';
const DESKTOP_ONLY_RESULT: ActionResult = { ok: false, method: null, error: DESKTOP_ONLY };
const NO_DEVICES: ChatDevices = { emulator: null, browser: null };
const NO_DICTATION: DictationStart = { session: 0, error: DESKTOP_ONLY };
const NO_TRANSCRIPTION: TranscriptionResult = { ok: false, text: '', error: DESKTOP_ONLY };

// window.radar for Orbit Web: the same RadarApi the desktop window gets from its preload, over HTTP. What is
// desktop-only (REMOTE_ACCESS) answers locally as unavailable, and the UI hides its buttons on the web.
export function createHttpRadar(call: RemoteCall): RadarApi {
  return {
    getImage: (sessionId: string, key: string): Promise<string | null> => call('GetImage', [sessionId, key]),
    getTurnProgress: (sessionId: string): Promise<TurnProgress | null> => call('GetTurnProgress', [sessionId]),
    getChatColor: (sessionId: string): Promise<string | null> => call('GetChatColor', [sessionId]),
    listLaunchers: (): Promise<LauncherEntry[]> => call('ListLaunchers', []),
    openLauncher: (name: string): Promise<ActionResult> => call('OpenLauncher', [name]),
    addShortcut: (_draft: ShortcutDraft): Promise<ActionResult> => Promise.resolve(DESKTOP_ONLY_RESULT),
    chooseFolder: (): Promise<string | null> => Promise.resolve(null),
    listPastChats: (): Promise<PastChat[]> => call('ListPastChats', []),
    getTimelineHistory: (sinceMs: number): Promise<ClosedChatActivity[]> => call('GetTimelineHistory', [sinceMs]),
    resumeChat: (sessionId: string): Promise<ActionResult> => call('ResumeChat', [sessionId]),
    prepareDictation: (): void => undefined,
    startDictation: (): Promise<DictationStart> => Promise.resolve(NO_DICTATION),
    feedDictation: (): void => undefined,
    finishDictation: (): Promise<TranscriptionResult> => Promise.resolve(NO_TRANSCRIPTION),
    cancelDictation: (): void => undefined,
    onDictationTranscript: (): void => undefined,
    getChats: (): Promise<ChatSnapshot[]> => call('GetChats', []),
    // JSON turns a missing argument into null, which the route reads as "the usual amount".
    getTranscript: (sessionId: string, limit?: number): Promise<TranscriptItem[]> => call('GetTranscript', [sessionId, limit ?? null]),
    getAgentTranscript: (sessionId: string, agentId: string, limit?: number): Promise<TranscriptItem[]> =>
      call('GetAgentTranscript', [sessionId, agentId, limit ?? null]),
    getUsage: (): Promise<UsageSnapshot> => call('GetUsage', []),
    focusChat: (): Promise<void> => Promise.resolve(),
    renameChat: (pid: number, name: string): Promise<ActionResult> => call('RenameChat', [pid, name]),
    recolorChat: (pid: number, color: ChatColor): Promise<ActionResult> => call('RecolorChat', [pid, color]),
    sendMessage: (pid: number, text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult> =>
      call('SendMessage', [pid, text, attachments]),
    closeChat: (): Promise<ActionResult> => Promise.resolve(DESKTOP_ONLY_RESULT),
    interruptChat: (pid: number): Promise<ActionResult> => call('InterruptChat', [pid]),
    openChatWindow: (): Promise<void> => Promise.resolve(),
    getQuestionPicker: (sessionId: string): Promise<QuestionPicker | null> => call('GetQuestionPicker', [sessionId]),
    answerQuestion: (sessionId: string, fingerprint: string, answer: QuestionAnswer): Promise<ActionResult> =>
      call('AnswerQuestion', [sessionId, fingerprint, answer]),
    submitAnswers: (sessionId: string, fingerprint: string): Promise<ActionResult> => call('SubmitAnswers', [sessionId, fingerprint]),
    answerQuestionSet: (sessionId: string, questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult> =>
      call('AnswerQuestionSet', [sessionId, questionId, answers]),
    stopAgent: (sessionId: string, agentId: string): Promise<ActionResult> => call('StopAgent', [sessionId, agentId]),
    getShellOutput: (sessionId: string, taskId: string): Promise<ShellOutput | null> => call('GetShellOutput', [sessionId, taskId]),
    interruptShell: (sessionId: string, taskId: string): Promise<ActionResult> => call('InterruptShell', [sessionId, taskId]),
    getChatSettings: (sessionId: string): Promise<ChatSettings> => call('GetChatSettings', [sessionId]),
    listSkills: (sessionId: string): Promise<SkillEntry[]> => call('ListSkills', [sessionId]),
    setChatModel: (pid: number, model: ModelChoice): Promise<ActionResult> => call('SetChatModel', [pid, model]),
    setChatEffort: (pid: number, effort: EffortLevel): Promise<ActionResult> => call('SetChatEffort', [pid, effort]),
    getChatPermissions: (sessionId: string): Promise<ChatPermissions> => call('GetChatPermissions', [sessionId]),
    setPermissionMode: (sessionId: string, mode: CycledPermissionMode): Promise<ActionResult> => call('SetPermissionMode', [sessionId, mode]),
    // No device buttons on the web: they focus windows on the desktop.
    getChatDevices: (): Promise<ChatDevices> => Promise.resolve(NO_DEVICES),
    focusChatEmulator: (): Promise<DeviceFocus> => Promise.resolve('missing'),
    focusChatBrowser: (): Promise<DeviceFocus> => Promise.resolve('missing'),
    getChatResources: (): Promise<ResourceSnapshot> => call('GetChatResources', []),
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
