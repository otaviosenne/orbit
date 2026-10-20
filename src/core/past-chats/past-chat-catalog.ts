import { basename } from 'node:path';
import type { PastChat, Repository } from '../../shared/types';
import { FileMemo } from '../file-memo';
import { mapLimited } from '../map-limited';
import { decodeProjectDir } from '../project-path-decoder';
import { RepositoryResolver } from '../repository-resolver';
import { liveSessionIds } from '../session-registry';
import { selectCandidates } from './candidates';
import type { SessionFile } from './session-files';
import { listSessionFiles } from './session-files';
import { readSessionSummary } from './session-reader';
import type { SessionSummary } from './session-summary';

// The folder stays in the main process: the renderer only ever names a session, never a path to launch in.
export interface PastChatEntry {
  readonly chat: PastChat;
  readonly cwd: string;
}

const READ_CONCURRENCY: number = 16;

// Closed chats across every project, like Claude Code's /resume with all projects shown.
export class PastChatCatalog {
  private readonly summaries: FileMemo<SessionSummary> = new FileMemo();
  private readonly repositories: RepositoryResolver = new RepositoryResolver();
  private known: Map<string, PastChatEntry> = new Map();

  async list(): Promise<PastChat[]> {
    const candidates: SessionFile[] = selectCandidates(await listSessionFiles(), await liveSessionIds(), Date.now());
    const entries: (PastChatEntry | null)[] = await mapLimited(candidates, READ_CONCURRENCY, (file: SessionFile) => this.describe(file));
    const listed: PastChatEntry[] = entries.filter((entry: PastChatEntry | null): entry is PastChatEntry => entry !== null);
    this.known = new Map(listed.map((entry: PastChatEntry): [string, PastChatEntry] => [entry.chat.sessionId, entry]));
    return listed.map((entry: PastChatEntry) => entry.chat);
  }

  // Only sessions from a listing can be resumed; a stale renderer gets one fresh listing to find it in.
  async find(sessionId: string): Promise<PastChatEntry | null> {
    if (!this.known.has(sessionId)) await this.list();
    return this.known.get(sessionId) ?? null;
  }

  // How a transcript is listed, or null when it is not a chat; listing it does not make it resumable.
  async describe(file: SessionFile): Promise<PastChatEntry | null> {
    // A transcript removed mid-listing is simply left out.
    const summary: SessionSummary | null = await this.summaries
      .get(file.path, (): Promise<SessionSummary> => readSessionSummary(file.path))
      .catch((): null => null);
    if (summary === null || !summary.isChat || summary.title === null) return null;
    const cwd: string | null = summary.cwd ?? (await decodeProjectDir(basename(file.projectDir)));
    if (cwd === null) return null;
    const repository: Repository = await this.repositories.resolve(cwd);
    return {
      chat: { sessionId: file.sessionId, title: summary.title, repository, lastActivityAt: file.modifiedAt, sizeBytes: file.sizeBytes },
      cwd,
    };
  }
}

