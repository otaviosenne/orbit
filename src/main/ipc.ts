import { ipcMain } from 'electron';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import type { ChatRadar } from '../core/chat-radar';
import type { PastChatCatalog } from '../core/past-chats/past-chat-catalog';
import type { TimelineHistory } from '../core/timeline-history/timeline-history';
import type { UsageService } from '../core/usage-service';
import { transcriptLimit } from '../core/transcript-limit';
import type {
  ActionResult,
  AttachmentUpload,
  ChatSnapshot,
  ClosedChatActivity,
  DictationStart,
  LauncherEntry,
  PastChat,
  QuestionPicker,
  TranscriptItem,
  TurnProgress,
  TranscriptionResult,
  UsageSnapshot,
} from '../shared/types';
import { IpcChannel } from '../shared/ipc-channels';
import { isSessionId } from '../shared/session-id';
import { recolorChat, renameChat, sendMessage } from './chat-actions';
import { closeChat } from './chat-closer';
import { interruptChat } from './chat-interrupt';
import { registerChatSettingsHandlers } from './chat-settings/chat-settings-ipc';
import { resumeChat } from './chat-resumer';
import type { ChatWindows } from './chat-windows';
import type { DictationService } from './dictation-service';
import { stopAgent } from './agent-stop/agent-stopper';
import { chooseFolder } from './folder-picker';
import { listLaunchers, openLauncher } from './launcher';
import { readQuestionPicker } from './questions/chat-picker';
import { answerQuestion, submitAnswers } from './questions/question-answerer';
import { addShortcut } from './shortcut-actions';
import { focusTerminalOf } from './terminal-focus';

export interface RadarServices {
  readonly radar: ChatRadar;
  readonly usage: UsageService;
  readonly dictation: DictationService;
  readonly chatWindows: ChatWindows;
  readonly pastChats: PastChatCatalog;
  readonly timelineHistory: TimelineHistory;
}

export function registerIpcHandlers({ radar, usage, dictation, chatWindows, pastChats, timelineHistory }: RadarServices): void {
  ipcMain.handle(IpcChannel.GetChats, (): Promise<ChatSnapshot[]> => radar.chats());
  ipcMain.handle(
    IpcChannel.GetTranscript,
    (_event: IpcMainInvokeEvent, sessionId: string, limit: unknown): Promise<TranscriptItem[]> =>
      radar.transcript(sessionId, transcriptLimit(limit)),
  );
  ipcMain.handle(
    IpcChannel.GetAgentTranscript,
    (_event: IpcMainInvokeEvent, sessionId: string, agentId: string, limit: unknown): Promise<TranscriptItem[]> =>
      radar.agentTranscript(sessionId, agentId, transcriptLimit(limit)),
  );
  ipcMain.handle(IpcChannel.GetUsage, (): Promise<UsageSnapshot> => usage.current());
  ipcMain.handle(
    IpcChannel.GetImage,
    (_event: IpcMainInvokeEvent, sessionId: string, key: string): Promise<string | null> => radar.image(sessionId, key),
  );
  ipcMain.handle(
    IpcChannel.GetTurnProgress,
    (_event: IpcMainInvokeEvent, sessionId: string): Promise<TurnProgress | null> => radar.turnProgress(sessionId),
  );
  ipcMain.handle(IpcChannel.GetChatColor, (_event: IpcMainInvokeEvent, sessionId: unknown): Promise<string | null> =>
    // The id is searched for as a file name, so anything but a real session id is refused.
    isSessionId(sessionId) ? radar.colorOf(sessionId) : Promise.resolve(null),
  );
  ipcMain.handle(IpcChannel.ListLaunchers, (): Promise<LauncherEntry[]> => listLaunchers());
  ipcMain.handle(
    IpcChannel.OpenLauncher,
    (_event: IpcMainInvokeEvent, name: string): Promise<ActionResult> => openLauncher(name),
  );
  ipcMain.handle(IpcChannel.AddShortcut, (_event: IpcMainInvokeEvent, draft: unknown): Promise<ActionResult> => addShortcut(draft));
  ipcMain.handle(IpcChannel.ChooseFolder, (event: IpcMainInvokeEvent): Promise<string | null> => chooseFolder(event.sender));
  ipcMain.handle(IpcChannel.ListPastChats, (): Promise<PastChat[]> => pastChats.list());
  ipcMain.handle(
    IpcChannel.GetTimelineHistory,
    (_event: IpcMainInvokeEvent, sinceMs: unknown): Promise<ClosedChatActivity[]> => timelineHistory.since(sinceMs, Date.now()),
  );
  ipcMain.handle(
    IpcChannel.ResumeChat,
    (_event: IpcMainInvokeEvent, sessionId: unknown): Promise<ActionResult> => resumeChat(pastChats, sessionId),
  );
  ipcMain.handle(IpcChannel.FocusChat, (_event: IpcMainInvokeEvent, pid: number): Promise<void> => focusTerminalOf(pid));
  ipcMain.handle(
    IpcChannel.RenameChat,
    (_event: IpcMainInvokeEvent, pid: number, name: string): Promise<ActionResult> => renameChat(pid, name),
  );
  ipcMain.handle(
    IpcChannel.RecolorChat,
    (_event: IpcMainInvokeEvent, pid: number, color: string): Promise<ActionResult> => recolorChat(pid, color),
  );
  ipcMain.handle(
    IpcChannel.SendMessage,
    (_event: IpcMainInvokeEvent, pid: number, text: string, uploads: AttachmentUpload[]): Promise<ActionResult> =>
      sendMessage(pid, text, uploads),
  );
  ipcMain.handle(IpcChannel.CloseChat, (_event: IpcMainInvokeEvent, pid: number): Promise<ActionResult> => closeChat(pid));
  ipcMain.handle(IpcChannel.InterruptChat, (_event: IpcMainInvokeEvent, pid: number): Promise<ActionResult> => interruptChat(pid));
  ipcMain.handle(IpcChannel.OpenChatWindow, (_event: IpcMainInvokeEvent, sessionId: unknown): void => {
    // The id ends up in a file URL, so anything but a real id is ignored.
    if (typeof sessionId === 'string' && sessionId.length > 0) chatWindows.open(sessionId);
  });
  registerQuestionHandlers(radar);
  ipcMain.handle(
    IpcChannel.StopAgent,
    (_event: IpcMainInvokeEvent, sessionId: unknown, agentId: unknown): Promise<ActionResult> => stopAgent(radar, sessionId, agentId),
  );
  registerChatSettingsHandlers(radar);
  registerDictationHandlers(dictation);
}

function registerQuestionHandlers(radar: ChatRadar): void {
  ipcMain.handle(
    IpcChannel.GetQuestionPicker,
    (_event: IpcMainInvokeEvent, sessionId: unknown): Promise<QuestionPicker | null> => readQuestionPicker(radar, sessionId),
  );
  ipcMain.handle(
    IpcChannel.AnswerQuestion,
    (_event: IpcMainInvokeEvent, sessionId: unknown, fingerprint: unknown, answer: unknown): Promise<ActionResult> =>
      answerQuestion(radar, sessionId, fingerprint, answer),
  );
  ipcMain.handle(
    IpcChannel.SubmitAnswers,
    (_event: IpcMainInvokeEvent, sessionId: unknown, fingerprint: unknown): Promise<ActionResult> => submitAnswers(radar, sessionId, fingerprint),
  );
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
