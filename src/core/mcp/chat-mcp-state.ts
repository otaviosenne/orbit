import { searchTail } from '../tail-search';
import type { TailSearchResult } from '../tail-search';
import type { McpServerEntry } from '../../shared/types';

// What the chat itself knows about its servers. `claude mcp list` starts fresh servers to test them, so it says
// "Connected" for a server this chat lost; Claude Code writes the chat's own view into its transcript.
export interface ChatMcpState {
  readonly failed: ReadonlySet<string>;
  readonly pending: ReadonlySet<string>;
}

export const NO_CHAT_MCP_STATE: ChatMcpState = { failed: new Set(), pending: new Set() };

interface ServerRef {
  readonly name?: string;
}

interface ToolsDelta {
  readonly type?: string;
  readonly failedMcpServers?: readonly ServerRef[];
  readonly pendingMcpServers?: readonly (ServerRef | string)[];
}

interface DeltaRecord {
  readonly timestamp?: string;
  readonly attachment?: ToolsDelta;
}

const DELTA_TYPE: string = 'deferred_tools_delta';
const FAILED_KEY: string = '"failedMcpServers"';

// The newest tool-list update that reports server health. A full re-send of the tool list (after compaction) leaves
// the field out and says nothing new, so it is skipped. Anything older than the process is another run's: a resumed
// chat reconnects every server.
export async function readChatMcpState(transcriptPath: string, processStartedAt: number): Promise<ChatMcpState> {
  return searchTail(transcriptPath, (text: string): TailSearchResult<ChatMcpState> => newestState(text, processStartedAt));
}

export function newestState(text: string, processStartedAt: number): TailSearchResult<ChatMcpState> {
  const lines: string[] = text.split('\n');
  for (let index: number = lines.length - 1; index >= 0; index--) {
    const record: DeltaRecord | null = healthRecord(lines[index] ?? '');
    if (record === null) continue;
    if (Date.parse(record.timestamp ?? '') < processStartedAt) return { value: NO_CHAT_MCP_STATE, satisfied: true };
    return { value: stateOf(record.attachment), satisfied: true };
  }
  return { value: NO_CHAT_MCP_STATE, satisfied: false };
}

function healthRecord(line: string): DeltaRecord | null {
  if (!line.includes(FAILED_KEY)) return null;
  try {
    const record: DeltaRecord = JSON.parse(line) as DeltaRecord;
    const delta: ToolsDelta | undefined = record.attachment;
    return delta?.type === DELTA_TYPE && Array.isArray(delta.failedMcpServers) ? record : null;
  } catch {
    return null;
  }
}

function stateOf(delta: ToolsDelta | undefined): ChatMcpState {
  const failed: string[] = (delta?.failedMcpServers ?? []).map(nameOf);
  const pending: string[] = (delta?.pendingMcpServers ?? []).map(nameOf);
  return { failed: new Set(failed), pending: new Set(pending) };
}

function nameOf(server: ServerRef | string): string {
  return typeof server === 'string' ? server : (server.name ?? '');
}

// Only a server the check found healthy is overridden: one that already needs sign-in or approval has a clearer reason.
export function applyChatMcpState(entries: readonly McpServerEntry[], state: ChatMcpState): McpServerEntry[] {
  return entries.map((entry: McpServerEntry): McpServerEntry => {
    if (entry.status !== 'connected') return entry;
    if (state.failed.has(entry.name)) return { ...entry, status: 'dropped' };
    if (state.pending.has(entry.name)) return { ...entry, status: 'connecting' };
    return entry;
  });
}
