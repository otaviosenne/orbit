import { transcriptLimit } from '../../core/transcript-limit';
import type { RemoteChannel } from '../../shared/remote-access';
import { REMOTE_ACCESS } from '../../shared/remote-access';
import type { Route } from '../../shared/ipc-routing';
import { isSessionId } from '../../shared/session-id';
import type { AttachmentBlob, ChatSnapshot, ClosedChatActivity, LauncherEntry, PastChat, QuestionPicker, ShellOutput, TranscriptItem, TurnProgress, UsageSnapshot } from '../../shared/types';
import { readAttachment } from '../attachment-reader';
import { listLaunchers } from '../launcher';
import { readQuestionPicker } from '../questions/chat-picker';
import type { ResourceSnapshot } from '../../shared/chat-resources';
import type { BoardState } from '../../shared/board-state';
import type { ComputerStatus } from '../../shared/computer';
import type { RouteServices } from './route-services';
import { textArg } from './route-args';

type ReadChannel = { [K in RemoteChannel]: (typeof REMOTE_ACCESS)[K] extends 'read' ? K : never }[RemoteChannel];
// The chat settings popover's reads live with its actions in chat-settings-routes.ts.
type SettingsRead = 'GetChatSettings' | 'ListSkills' | 'ListMcpServers' | 'GetChatPermissions';

// Session ids are searched for as file names, so anything but a real one gets an empty answer.
export function readRoutes({ radar, usage, pastChats, timelineHistory, resources, boardState, computer }: RouteServices): Readonly<Record<Exclude<ReadChannel, SettingsRead>, Route>> {
  return {
    GetChats: (): Promise<ChatSnapshot[]> => radar.chats(),
    GetTranscript: (sessionId: unknown, limit: unknown): Promise<TranscriptItem[]> =>
      isSessionId(sessionId) ? radar.transcript(sessionId, transcriptLimit(limit)) : Promise.resolve([]),
    GetAgentTranscript: (sessionId: unknown, agentId: unknown, limit: unknown): Promise<TranscriptItem[]> =>
      isSessionId(sessionId) ? radar.agentTranscript(sessionId, textArg(agentId), transcriptLimit(limit)) : Promise.resolve([]),
    GetImage: (sessionId: unknown, key: unknown): Promise<string | null> =>
      isSessionId(sessionId) ? radar.image(sessionId, textArg(key)) : Promise.resolve(null),
    GetAttachment: (path: unknown): Promise<AttachmentBlob | null> => readAttachment(path),
    GetTurnProgress: (sessionId: unknown): Promise<TurnProgress | null> =>
      isSessionId(sessionId) ? radar.turnProgress(sessionId) : Promise.resolve(null),
    GetChatColor: (sessionId: unknown): Promise<string | null> => (isSessionId(sessionId) ? radar.colorOf(sessionId) : Promise.resolve(null)),
    GetUsage: (): Promise<UsageSnapshot> => usage.current(),
    ListLaunchers: (): Promise<LauncherEntry[]> => listLaunchers(),
    ListPastChats: (): Promise<PastChat[]> => pastChats.list(),
    GetTimelineHistory: (sinceMs: unknown): Promise<ClosedChatActivity[]> => timelineHistory.since(sinceMs, Date.now()),
    GetQuestionPicker: (sessionId: unknown): Promise<QuestionPicker | null> => readQuestionPicker(radar, sessionId),
    GetShellOutput: (sessionId: unknown, taskId: unknown): Promise<ShellOutput | null> =>
      isSessionId(sessionId) ? radar.shellOutput(sessionId, taskId) : Promise.resolve(null),
    GetChatResources: (): Promise<ResourceSnapshot> => resources.snapshot(),
    GetBoardState: (knownVersion: unknown): Promise<BoardState | null> => boardState.get(knownVersion),
    GetComputerStatus: (): Promise<ComputerStatus> => computer.status(),
  };
}
