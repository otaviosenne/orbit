import type {
  ActionResult,
  ChatPermissions,
  ChatSettings,
  ChatSnapshot,
  ClosedChatActivity,
  DictationStart,
  LauncherEntry,
  PastChat,
  QuestionPicker,
  SkillEntry,
  TranscriptionResult,
  TranscriptItem,
  TurnProgress,
  UsageSnapshot,
} from '../shared/types';
import type { IpcChannel } from '../shared/ipc-channels';
import { demoChatPermissions, demoChatSettings, demoSkills } from './demo-chat-settings';
import { demoChatSnapshot, demoChatSnapshots, findDemoChat } from './demo-chats';
import { demoLaunchers } from './demo-launchers';
import { demoPastChatColor, demoPastChats } from './demo-past-chats';
import { demoQuestionPicker } from './demo-question-picker';
import { demoTimelineHistory } from './demo-timeline';
import { demoTurnProgress } from './demo-turn-progress';
import { demoUsage } from './demo-usage';
import { demoAgentTranscript } from './transcripts/agents';

type ChannelKey = keyof typeof IpcChannel;

// Sent with ipcRenderer.send rather than invoked, so they get listeners instead of routes.
export const LISTENER_CHANNELS = ['DictationPrepare', 'DictationAudio', 'DictationCancel'] as const satisfies readonly ChannelKey[];
// Main pushes on this one; the renderer listens.
type PushChannel = 'DictationTranscript';
export type InvokeChannel = Exclude<ChannelKey, (typeof LISTENER_CHANNELS)[number] | PushChannel>;
export type DemoRoute = (...args: unknown[]) => unknown;

// Actions pretend to succeed and change nothing: no terminal, file or network is ever touched.
const DONE: ActionResult = { ok: true, method: 'socket', error: null };
const EMPTY_TRANSCRIPTION: TranscriptionResult = { ok: true, text: '', error: null };

let dictationSession: number = 0;

// A Record over every invoke channel: a channel added to the real app without a demo answer fails the type check.
export const DEMO_ROUTES: Readonly<Record<InvokeChannel, DemoRoute>> = {
  GetChats: (): ChatSnapshot[] => demoChatSnapshots(Date.now()),
  GetTranscript: (sessionId: unknown): TranscriptItem[] => findDemoChat(sessionId)?.transcript() ?? [],
  GetAgentTranscript: (sessionId: unknown, agentId: unknown): TranscriptItem[] => demoAgentTranscript(sessionId, agentId),
  GetImage: (): null => null,
  GetTurnProgress: (sessionId: unknown): TurnProgress | null => demoTurnProgress(demoChatSnapshot(sessionId, Date.now()), Date.now()),
  GetChatColor: (sessionId: unknown): string | null => findDemoChat(sessionId)?.color ?? demoPastChatColor(sessionId),
  GetUsage: (): UsageSnapshot => demoUsage(Date.now()),
  ListLaunchers: (): LauncherEntry[] => demoLaunchers(),
  OpenLauncher: (): ActionResult => DONE,
  AddShortcut: (): ActionResult => DONE,
  // As if the folder picker was cancelled: a real dialog would pop up on the user's screen.
  ChooseFolder: (): null => null,
  ListPastChats: (): PastChat[] => demoPastChats(),
  GetTimelineHistory: (sinceMs: unknown): ClosedChatActivity[] => demoTimelineHistory(sinceMs),
  ResumeChat: (): ActionResult => DONE,
  FocusChat: (): void => undefined,
  RenameChat: (): ActionResult => DONE,
  RecolorChat: (): ActionResult => DONE,
  SendMessage: (): ActionResult => DONE,
  CloseChat: (): ActionResult => DONE,
  InterruptChat: (): ActionResult => DONE,
  // A popped-out window would land on the user's visible workspace, so the demo never opens one.
  OpenChatWindow: (): void => undefined,
  GetQuestionPicker: (sessionId: unknown): QuestionPicker | null => demoQuestionPicker(sessionId),
  AnswerQuestion: (): ActionResult => DONE,
  SubmitAnswers: (): ActionResult => DONE,
  StopAgent: (): ActionResult => DONE,
  GetChatSettings: (): ChatSettings => demoChatSettings(),
  ListSkills: (): SkillEntry[] => demoSkills(),
  SetChatModel: (): ActionResult => DONE,
  SetChatEffort: (): ActionResult => DONE,
  GetChatPermissions: (): ChatPermissions => demoChatPermissions(),
  SetPermissionMode: (): ActionResult => DONE,
  DictationStart: (): DictationStart => ({ session: ++dictationSession, error: null }),
  DictationFinish: (): TranscriptionResult => EMPTY_TRANSCRIPTION,
};
