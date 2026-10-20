import { clipSpans } from '../../shared/time-span';
import type { AgentSnapshot, ClosedChatActivity, TimeSpan } from '../../shared/types';
import { FileMemo } from '../file-memo';
import { mapLimited } from '../map-limited';
import type { PastChatCatalog, PastChatEntry } from '../past-chats/past-chat-catalog';
import type { SessionFile } from '../past-chats/session-files';
import { listSessionFiles } from '../past-chats/session-files';
import { liveSessionIds } from '../session-registry';
import { SubagentReader } from '../subagent-reader';
import { settleClosedAgents } from './closed-agents';
import { filesActiveSince, historySince } from './history-window';
import type { TranscriptActivity } from './transcript-activity';
import { readTranscriptActivity } from './transcript-activity';

const READ_CONCURRENCY: number = 8;

// Closed chats that worked inside the timeline's window, titled the way the Resume list titles them.
export class TimelineHistory {
  private readonly activity: FileMemo<TranscriptActivity> = new FileMemo();
  private readonly subagents: SubagentReader = new SubagentReader();

  constructor(private readonly catalog: PastChatCatalog) {}

  async since(requested: unknown, now: number): Promise<ClosedChatActivity[]> {
    const since: number | null = historySince(requested, now);
    if (since === null) return [];
    const files: SessionFile[] = filesActiveSince(await listSessionFiles(), await liveSessionIds(), since);
    const chats: (ClosedChatActivity | null)[] = await mapLimited(files, READ_CONCURRENCY, (file: SessionFile) =>
      this.toActivity(file, { start: since, end: now }, now),
    );
    return chats.filter((chat: ClosedChatActivity | null): chat is ClosedChatActivity => chat !== null);
  }

  private async toActivity(file: SessionFile, window: TimeSpan, now: number): Promise<ClosedChatActivity | null> {
    const entry: PastChatEntry | null = await this.catalog.describe(file);
    // A transcript removed mid-read is simply left out.
    const activity: TranscriptActivity | null = await this.activity
      .get(file.path, (): Promise<TranscriptActivity> => readTranscriptActivity(file.path, file.modifiedAt))
      .catch((): null => null);
    if (entry === null || activity === null) return null;
    const turns: TimeSpan[] = clipSpans(activity.turns, window);
    const agents: AgentSnapshot[] = settleClosedAgents(await this.subagents.read(file.path, window.start, now));
    if (turns.length === 0 && agents.length === 0) return null;
    const { sessionId, title, repository } = entry.chat;
    return { sessionId, title, repository, color: activity.color, lastActivityAt: file.modifiedAt, turns, agents };
  }
}
