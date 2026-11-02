import { listLiveSessions } from '../core/session-registry';
import type { SessionRecord } from '../core/session-registry';
import type { ActionResult } from '../shared/types';
import { closeChat } from './chat-closer';
import { CHAT_WORKSPACE } from './chat-workspace';
import { launchThroughHyprland, silentlyOnWorkspace } from './hyprland-exec';
import { buildResumeCommand } from './resume-command';
import { delay } from './run-command';
import { failure } from './terminal-input';
import type { WindowPlacement } from './terminal-window';
import { findTerminalWindowPid, windowPlacement } from './terminal-window';

// Claude Code reads its skills, MCP servers, CLAUDE.md files and settings when it starts; the session cannot
// reload them in place. Restarting closes the chat and resumes the same session, on the workspace it was on.
const EXIT_CHECK_MS: number = 200;
// Long enough for Claude Code to save its transcript and stop its MCP servers after the window closes.
const EXIT_TIMEOUT_MS: number = 15_000;
const RESTARTED: ActionResult = { ok: true, method: null, error: null };

export async function restartChat(chatPid: number): Promise<ActionResult> {
  const session: SessionRecord | undefined = (await listLiveSessions()).find((candidate: SessionRecord) => candidate.pid === chatPid);
  if (session === undefined) return failure('Chat not found');
  const workspace: number = await workspaceOf(chatPid);
  const closed: ActionResult = await closeChat(chatPid);
  if (!closed.ok) return closed;
  // `claude --resume` refuses a session another process still holds, so the old one must be gone first.
  if (!(await hasExited(chatPid))) return failure('The chat did not close in time; it was not reopened');
  try {
    await launchThroughHyprland(silentlyOnWorkspace(workspace, buildResumeCommand(session.cwd, session.sessionId)));
    return RESTARTED;
  } catch (error: unknown) {
    return failure(`Closed, but could not reopen it: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// A chat whose window cannot be found reopens where new chats wait.
async function workspaceOf(chatPid: number): Promise<number> {
  const windowPid: number | null = await findTerminalWindowPid(chatPid).catch((): null => null);
  const placement: WindowPlacement | null = windowPid === null ? null : await windowPlacement(windowPid).catch((): null => null);
  return placement?.workspace ?? CHAT_WORKSPACE;
}

async function hasExited(pid: number): Promise<boolean> {
  for (let waited: number = 0; waited < EXIT_TIMEOUT_MS; waited += EXIT_CHECK_MS) {
    if (!isRunning(pid)) return true;
    await delay(EXIT_CHECK_MS);
  }
  return !isRunning(pid);
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
