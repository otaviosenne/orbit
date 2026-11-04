import { access } from 'node:fs/promises';
import type { PastChatCatalog, PastChatEntry } from '../core/past-chats/past-chat-catalog';
import { liveSessionIds } from '../core/session-registry';
import { isSessionId } from '../shared/session-id';
import { CUT_MESSAGE, SHUTDOWN_CONTINUE_MESSAGE } from '../shared/pause-messages';
import type { ActionResult } from '../shared/types';
import { launchChatInBackground } from './chat-workspace';
import { buildResumeCommand } from './resume-command';
import { sendAfterResume } from './resumed-chat-message';
import type { ShutdownPausedChats } from './shutdown/shutdown-paused-chats';
import { failure } from './terminal-input';

// Reopens a closed chat in a new kitty window, in the folder it was started in.
// afterCut: the chat was working when the machine went down; it is told so as its first message. A chat a safe
// shutdown paused is told to continue instead, as Continue does after Pause all chats.
export async function resumeChat(catalog: PastChatCatalog, sessionId: unknown, afterCut: boolean, pausedByShutdown: ShutdownPausedChats): Promise<ActionResult> {
  if (!isSessionId(sessionId)) return failure('Not a session id');
  const entry: PastChatEntry | null = await catalog.find(sessionId);
  if (entry === null) return failure('Unknown chat');
  // The list can be a poll behind: a chat reopened a moment ago must not open twice.
  if ((await liveSessionIds()).has(sessionId)) return failure('This chat is already open');
  if (!(await exists(entry.cwd))) return failure(`Its folder no longer exists: ${entry.cwd}`);
  try {
    await launchChatInBackground(buildResumeCommand(entry.cwd, sessionId));
    const wasPaused: boolean = await pausedByShutdown.take(sessionId, Date.now());
    const message: string | null = wasPaused ? SHUTDOWN_CONTINUE_MESSAGE : afterCut ? CUT_MESSAGE : null;
    // Not waited for: the reopened chat is told while the user goes on; a failure is only logged.
    if (message !== null) void sendAfterResume(sessionId, message).then((result: ActionResult): void => {
      if (!result.ok) console.error(`Telling reopened chat ${sessionId} to carry on failed: ${result.error ?? 'unknown'}`);
    });
    return { ok: true, method: null, error: null };
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
