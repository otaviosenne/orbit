import type { ChatSnapshot } from '../../shared/types';
import type { OpenChatsMemory, RememberedChat } from './open-chats-memory';

// Long enough for the login scripts (boot-restore.sh) to finish reopening saved windows, so no chat is opened twice.
export const RESTORE_DELAY_MS: number = 60_000;
// One chat at a time keeps the machine responsive while many Claude processes start.
export const RESTORE_STAGGER_MS: number = 2_500;

export interface StartupRestoreDeps {
  readonly memory: OpenChatsMemory;
  readonly livePoll: () => Promise<readonly ChatSnapshot[]>;
  readonly isSuspended: (sessionId: string) => boolean;
  readonly reopen: (chat: RememberedChat) => Promise<boolean>;
  readonly pause: (ms: number) => Promise<void>;
}

// Once per start: reopens the chats that were open before Orbit stopped but are not running now.
export async function restoreOpenChats(deps: StartupRestoreDeps): Promise<void> {
  await deps.pause(RESTORE_DELAY_MS);
  const candidates: RememberedChat[] = deps.memory.closed(await deps.livePoll()).filter((chat: RememberedChat) => !deps.isSuspended(chat.sessionId));
  for (const chat of candidates) {
    // Checked again right before each launch: a chat may have been opened by hand while the others were starting.
    const live: readonly ChatSnapshot[] = await deps.livePoll();
    if (live.some((candidate: ChatSnapshot) => candidate.sessionId === chat.sessionId)) continue;
    if (!(await deps.reopen(chat))) deps.memory.forget(chat.sessionId);
    await deps.pause(RESTORE_STAGGER_MS);
  }
}
