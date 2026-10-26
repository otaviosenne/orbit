import { listMcpServers } from '../../core/mcp/mcp-health';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { isSessionId } from '../../shared/session-id';
import type { McpServerEntry } from '../../shared/types';

// The folder comes from the live session, not from the renderer, like the skills do.
export async function listMcpServersForChat(sessionId: unknown): Promise<McpServerEntry[]> {
  if (!isSessionId(sessionId)) return [];
  const session: SessionRecord | undefined = (await listLiveSessions()).find((live: SessionRecord) => live.sessionId === sessionId);
  if (session === undefined) return [];
  try {
    return await listMcpServers(session.cwd, Date.now());
  } catch {
    return [];
  }
}
