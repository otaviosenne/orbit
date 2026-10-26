import { applyChatMcpState, NO_CHAT_MCP_STATE, readChatMcpState } from '../../core/mcp/chat-mcp-state';
import type { ChatMcpState } from '../../core/mcp/chat-mcp-state';
import { listMcpServers } from '../../core/mcp/mcp-health';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { TranscriptLocator } from '../../core/transcript-locator';
import { isSessionId } from '../../shared/session-id';
import type { McpServerEntry } from '../../shared/types';

const transcripts: TranscriptLocator = new TranscriptLocator();

// The folder comes from the live session, not from the renderer, like the skills do. A failed check rejects, so the
// panel can say it could not look instead of claiming the chat has no servers.
export async function listMcpServersForChat(sessionId: unknown): Promise<McpServerEntry[]> {
  if (!isSessionId(sessionId)) return [];
  const session: SessionRecord | undefined = (await listLiveSessions()).find((live: SessionRecord) => live.sessionId === sessionId);
  if (session === undefined) return [];
  const [entries, state]: [McpServerEntry[], ChatMcpState] = await Promise.all([listMcpServers(session.cwd, Date.now()), chatState(session)]);
  return applyChatMcpState(entries, state);
}

// Without the chat's own view the list is still right about every server the check can reach.
async function chatState(session: SessionRecord): Promise<ChatMcpState> {
  try {
    const path: string | null = await transcripts.locate(session.sessionId);
    return path === null ? NO_CHAT_MCP_STATE : await readChatMcpState(path, session.startedAt);
  } catch {
    return NO_CHAT_MCP_STATE;
  }
}
