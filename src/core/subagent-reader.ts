import { readdir, stat } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { join } from 'node:path';
import type { AgentSnapshot, AgentState } from '../shared/types';
import { classifyAgent } from './agent-classifier';
import { isAgentOver, readAgentMeta } from './agent-meta';
import type { AgentMeta } from './agent-meta';
import { extractAgentFacts } from './agent-facts';
import type { AgentFacts } from './agent-facts';
import { AGENT_READ_BYTES } from './config';
import { FileMemo } from './file-memo';
import { readTail } from './file-reader';
import { isConversationLine, parseRecords } from './jsonl';

const META_SUFFIX: string = '.meta.json';
const TRANSCRIPT_SUFFIX: string = '.jsonl';
const AGENT_FILE_PREFIX: string = 'agent-';

export class SubagentReader {
  private readonly facts: FileMemo<AgentFacts> = new FileMemo();

  // Agents last written before the chat process started belong to an earlier run of that chat.
  async read(transcriptPath: string, processStartedAt: number, now: number): Promise<AgentSnapshot[]> {
    const directory: string = subagentDirectory(transcriptPath);
    const ids: string[] = await listAgentIds(directory);
    const agents: (AgentSnapshot | null)[] = await Promise.all(
      ids.map((id: string) => this.readAgent(directory, id, processStartedAt, now)),
    );
    return agents.filter((agent: AgentSnapshot | null): agent is AgentSnapshot => agent !== null);
  }

  private async readAgent(directory: string, id: string, since: number, now: number): Promise<AgentSnapshot | null> {
    const transcript: string = join(directory, `${AGENT_FILE_PREFIX}${id}${TRANSCRIPT_SUFFIX}`);
    const stats: Stats | null = await statOrNull(transcript);
    if (stats === null || stats.mtimeMs < since) return null;
    const facts: AgentFacts = await this.facts.get(transcript, () => loadFacts(transcript));
    // Read every time: a stop rewrites the meta after the transcript's last line, so a memo on the transcript would miss it.
    const meta: AgentMeta = await readAgentMeta(join(directory, `${AGENT_FILE_PREFIX}${id}${META_SUFFIX}`));
    return toSnapshot(id, meta, facts, stats.mtimeMs, now);
  }
}

function toSnapshot(id: string, meta: AgentMeta, facts: AgentFacts, lastActivityAt: number, now: number): AgentSnapshot {
  const state: AgentState = classifyAgent(
    { finishedFlag: isAgentOver(meta), endedCleanly: facts.endedCleanly, lastActivityAt },
    now,
  );
  return {
    id,
    description: meta.description ?? meta.agentType ?? 'Agent',
    agentType: meta.agentType ?? 'agent',
    state,
    startedAt: startOf(state, facts) ?? lastActivityAt,
    lastActivityAt,
    endedAt: state === 'done' ? (facts.lastRecordAt ?? lastActivityAt) : null,
  };
}

// A finished agent reports its whole lifetime; a live one reports how long the current run has taken.
function startOf(state: AgentState, facts: AgentFacts): number | null {
  return state === 'done' ? facts.firstPromptAt : (facts.runStartedAt ?? facts.firstPromptAt);
}

async function loadFacts(transcriptPath: string): Promise<AgentFacts> {
  const text: string = (await readTail(transcriptPath, AGENT_READ_BYTES)).text;
  return extractAgentFacts(parseRecords(text, isConversationLine));
}

async function listAgentIds(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory))
      .filter((file: string) => file.startsWith(AGENT_FILE_PREFIX) && file.endsWith(TRANSCRIPT_SUFFIX))
      .map((file: string) => file.slice(AGENT_FILE_PREFIX.length, -TRANSCRIPT_SUFFIX.length));
  } catch {
    return [];
  }
}

async function statOrNull(path: string): Promise<Stats | null> {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

// Agent ids are hex strings Claude Code picks; anything else could point outside the subagents folder.
const AGENT_ID: RegExp = /^[a-z0-9]+$/i;

export function subagentTranscriptPath(transcriptPath: string, agentId: string): string | null {
  return AGENT_ID.test(agentId) ? join(subagentDirectory(transcriptPath), `${AGENT_FILE_PREFIX}${agentId}${TRANSCRIPT_SUFFIX}`) : null;
}

export function subagentMetaPath(transcriptPath: string, agentId: string): string | null {
  return AGENT_ID.test(agentId) ? join(subagentDirectory(transcriptPath), `${AGENT_FILE_PREFIX}${agentId}${META_SUFFIX}`) : null;
}

function subagentDirectory(transcriptPath: string): string {
  return join(transcriptPath.slice(0, -TRANSCRIPT_SUFFIX.length), 'subagents');
}
