import type { ActionResult } from '../../shared/types';
import { asksPermission } from '../../core/chat-status';
import { allowsPermissionsAlways } from '../../core/permissions/always-allowed';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { allowShownPermission } from './permission-answerer';
import type { QuestionSource } from './question-lookup';

const CHECK_EVERY_MS: number = 2000;
// A prompt that cannot be read or answered is left to the user after this many tries, so the chat's font does not
// keep shrinking and growing back every check.
const MAX_TRIES: number = 3;

type Allow = (source: QuestionSource, sessionId: string) => Promise<ActionResult>;

// Answers "Yes" to the permission prompts of the chats set to Always approve, in Orbit's main process, so it works with
// no panel open and from Orbit Web alike.
export function startPermissionAutoAllower(source: QuestionSource): void {
  const tries: Map<string, number> = new Map();
  let isChecking: boolean = false;
  setInterval((): void => {
    if (isChecking) return;
    isChecking = true;
    void listLiveSessions()
      .then((sessions: SessionRecord[]): Promise<void> => allowPending(source, sessions, tries))
      .catch((error: unknown): void => console.error('Auto-approving permissions failed:', error))
      .finally((): void => void (isChecking = false));
  }, CHECK_EVERY_MS);
}

// Tries are counted per waiting stretch: the next prompt of the same chat starts a new one, and stretches that ended
// are forgotten.
export async function allowPending(
  source: QuestionSource,
  sessions: readonly SessionRecord[],
  tries: Map<string, number>,
  allow: Allow = allowShownPermission,
  isAllowed: (sessionId: string) => Promise<boolean> = allowsPermissionsAlways,
): Promise<void> {
  const waiting: SessionRecord[] = sessions.filter((session: SessionRecord) => asksPermission(session.status, session.waitingFor));
  const current: Set<string> = new Set(waiting.map(stretchKey));
  for (const key of [...tries.keys()]) if (!current.has(key)) tries.delete(key);
  for (const session of waiting) {
    const key: string = stretchKey(session);
    const tried: number = tries.get(key) ?? 0;
    if (tried >= MAX_TRIES || !(await isAllowed(session.sessionId))) continue;
    const result: ActionResult = await allow(source, session.sessionId);
    tries.set(key, result.ok ? MAX_TRIES : tried + 1);
    if (!result.ok) console.error(`Could not auto-approve a permission in ${session.name}:`, result.error);
  }
}

function stretchKey(session: SessionRecord): string {
  return `${session.sessionId}:${session.statusUpdatedAt}`;
}
