import type { AgentSnapshot, ChatSettings, ChatSnapshot, ShellSnapshot, TranscriptItem, TurnProgress } from '../shared/types';
import { ChatSettingsReader } from './chat-settings/chat-settings-reader';
import { PermissionRecordReader } from './chat-settings/permission-reader';
import type { PermissionMode } from '../shared/permission-modes';
import { AGENT_READ_BYTES, TRANSCRIPT_ITEM_LIMIT } from './config';
import { FileMemo } from './file-memo';
import { readTail } from './file-reader';
import { isConversationLine, parseRecords } from './jsonl';
import { normalizeStatus } from './chat-status';
import { ColorTracker } from './color-tracker';
import { RepositoryResolver } from './repository-resolver';
import { listLiveSessions } from './session-registry';
import type { SessionRecord } from './session-registry';
import { readAgentMeta } from './agent-meta';
import { ShellReader } from './shells/shell-reader';
import { SubagentReader, subagentMetaPath, subagentTranscriptPath } from './subagent-reader';
import type { ChatNameResolver } from './transcript-extractor';
import { TranscriptLocator } from './transcript-locator';
import { TranscriptReader } from './transcript-reader';
import { extractTurnProgress } from './turn-progress';
import type { WindowLocator } from './window-locator';

// Facade that turns the files Claude Code writes under ~/.claude into chat snapshots.
export class ChatRadar {
  private readonly locator: TranscriptLocator = new TranscriptLocator();
  private readonly colors: ColorTracker = new ColorTracker();
  private readonly subagents: SubagentReader = new SubagentReader();
  private readonly shells: ShellReader = new ShellReader();
  private readonly transcriptReader: TranscriptReader = new TranscriptReader();
  private readonly repositories: RepositoryResolver = new RepositoryResolver();
  // A chat's window never changes while its process lives, so the lookup is done once per pid.
  private readonly windows: Map<number, Promise<number | null>> = new Map();
  private readonly progress: FileMemo<TurnProgress | null> = new FileMemo();
  private readonly settingsReader: ChatSettingsReader = new ChatSettingsReader();
  private readonly permissionReader: PermissionRecordReader = new PermissionRecordReader();

  constructor(private readonly windowLocator: WindowLocator | null = null) {}

  async chats(): Promise<ChatSnapshot[]> {
    const now: number = Date.now();
    const sessions: SessionRecord[] = await listLiveSessions();
    const activeWindow: number | null = (await this.windowLocator?.activeWindowPid()) ?? null;
    return Promise.all(sessions.map((session: SessionRecord) => this.toChat(session, now, activeWindow)));
  }

  // The last `limit` items; fewer than asked means the chat has nothing older.
  async transcript(sessionId: string, limit: number = TRANSCRIPT_ITEM_LIMIT): Promise<TranscriptItem[]> {
    const transcript: string | null = await this.locator.locate(sessionId);
    return transcript === null ? [] : this.transcriptReader.read(transcript, liveChatNames, 'chat', limit);
  }

  // Claude Code marks an agent stopped in its meta file, which is how a stop sent from Orbit is confirmed.
  async isAgentStopped(sessionId: string, agentId: string): Promise<boolean> {
    const transcript: string | null = await this.locator.locate(sessionId);
    const metaPath: string | null = transcript === null ? null : subagentMetaPath(transcript, agentId);
    return metaPath !== null && (await readAgentMeta(metaPath)).stoppedByUser === true;
  }

  // What one of the chat's agents has done, read from its own transcript next to the chat's.
  async agentTranscript(sessionId: string, agentId: string, limit: number = TRANSCRIPT_ITEM_LIMIT): Promise<TranscriptItem[]> {
    const transcript: string | null = await this.locator.locate(sessionId);
    const agentPath: string | null = transcript === null ? null : subagentTranscriptPath(transcript, agentId);
    return agentPath === null ? [] : this.transcriptReader.read(agentPath, liveChatNames, 'agent', limit);
  }

  // An image from the chat's transcript as a data URL, for the image viewer.
  async image(sessionId: string, key: string): Promise<string | null> {
    const transcript: string | null = await this.locator.locate(sessionId);
    if (transcript === null) return null;
    const blob = await this.transcriptReader.image(transcript, key, liveChatNames);
    return blob === null ? null : `data:${blob.mediaType};base64,${blob.data}`;
  }

  // The /color a chat last had, read from its transcript; also works for a closed chat about to be resumed.
  async colorOf(sessionId: string): Promise<string | null> {
    const transcript: string | null = await this.locator.locate(sessionId);
    return transcript === null ? null : this.colors.colorOf(transcript);
  }

  // Reads the end of the transcript; a turn longer than this window just reports from the window's start.
  async turnProgress(sessionId: string): Promise<TurnProgress | null> {
    const transcript: string | null = await this.locator.locate(sessionId);
    if (transcript === null) return null;
    return this.progress.get(transcript, async (): Promise<TurnProgress | null> =>
      extractTurnProgress(parseRecords((await readTail(transcript, AGENT_READ_BYTES)).text, isConversationLine)),
    );
  }

  // The model and effort the chat runs on; null for each until it has replied or run /model or /effort.
  async settings(sessionId: string): Promise<ChatSettings> {
    const transcript: string | null = await this.locator.locate(sessionId);
    return transcript === null ? { model: null, effort: null } : this.settingsReader.read(transcript);
  }

  // The permission mode the transcript last logged; the terminal's footer is fresher when it can be read.
  async loggedPermissionMode(sessionId: string): Promise<PermissionMode | null> {
    const transcript: string | null = await this.locator.locate(sessionId);
    return transcript === null ? null : this.permissionReader.read(transcript);
  }

  private async toChat(session: SessionRecord, now: number, activeWindow: number | null): Promise<ChatSnapshot> {
    const transcript: string | null = await this.locator.locate(session.sessionId);
    const color: string | null = transcript === null ? null : await this.colors.colorOf(transcript);
    const agents: AgentSnapshot[] =
      transcript === null ? [] : await this.subagents.read(transcript, session.startedAt, now);
    const shells: ShellSnapshot[] = transcript === null ? [] : await this.shells.read(transcript, session.startedAt);
    return {
      sessionId: session.sessionId,
      pid: session.pid,
      name: session.name,
      color,
      repository: await this.repositories.resolve(session.cwd),
      cwd: session.cwd,
      startedAt: session.startedAt,
      status: normalizeStatus(session.status),
      statusSince: session.statusUpdatedAt,
      agents,
      shells,
      isFocused: activeWindow !== null && (await this.windowOf(session.pid)) === activeWindow,
    };
  }

  private windowOf(chatPid: number): Promise<number | null> {
    if (this.windowLocator === null) return Promise.resolve(null);
    const known: Promise<number | null> | undefined = this.windows.get(chatPid);
    if (known !== undefined) return known;
    const lookup: Promise<number | null> = this.windowLocator.windowPidOf(chatPid);
    this.windows.set(chatPid, lookup);
    return lookup;
  }
}

// Lets messages sent to another chat show that chat's current name instead of its socket path.
async function liveChatNames(): Promise<ChatNameResolver> {
  const sessions: SessionRecord[] = await listLiveSessions();
  const names: Map<number, string> = new Map(sessions.map((session: SessionRecord): [number, string] => [session.pid, session.name]));
  return (pid: number): string | null => names.get(pid) ?? null;
}
