import { listSkills } from '../../core/skills/skill-catalog';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { isSessionId } from '../../shared/session-id';
import type { SkillEntry } from '../../shared/types';

// Project skills depend on the folder the chat runs in, which is looked up here rather than trusted from the renderer.
export async function listSkillsForChat(sessionId: unknown): Promise<SkillEntry[]> {
  if (!isSessionId(sessionId)) return [];
  const session: SessionRecord | undefined = (await listLiveSessions()).find((live: SessionRecord) => live.sessionId === sessionId);
  return session === undefined ? [] : listSkills(session.cwd);
}
