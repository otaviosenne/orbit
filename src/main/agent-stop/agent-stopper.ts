import type { ActionResult, AgentSnapshot, ChatSnapshot } from '../../shared/types';
import { hasKittySocket } from '../kitty-remote';
import { PickerTerminal } from '../questions/picker-terminal';
import { failure, success } from '../terminal-input';
import { findTerminalWindowPid } from '../terminal-window';
import { STOP_CONFIRM_TIMEOUT_SECONDS, waitUntilStopped } from './stop-confirmation';
import type { AgentLookup } from './tasks-dialog';
import { TasksDialog } from './tasks-dialog';
import { terminalBlocker } from './terminal-readiness';

// What stopping needs from the radar: the open chats, and whether Claude Code marked an agent stopped.
export interface StopSource {
  chats(): Promise<ChatSnapshot[]>;
  isAgentStopped(sessionId: string, agentId: string): Promise<boolean>;
}

type Target = { readonly ok: true; readonly chat: ChatSnapshot; readonly agent: AgentSnapshot } | { readonly ok: false; readonly error: string };

const LOOKUP_ERRORS: Readonly<Record<Exclude<AgentLookup, 'shown'>, string>> = {
  missing: 'The chat does not list this agent as running any more',
  ambiguous: 'Another running agent has the same name; stop it from the chat window',
  'no-dialog': "The chat's background tasks did not open; check its window",
};

// Chats whose terminal is being driven; a second stop would interleave keys into the same dialog.
const inFlight: Set<string> = new Set();

// Stops one running agent through the chat's own /tasks dialog: found by its description, checked on its details, then x.
export async function stopAgent(source: StopSource, sessionId: unknown, agentId: unknown): Promise<ActionResult> {
  if (typeof sessionId !== 'string' || typeof agentId !== 'string') return failure('Unknown agent');
  if (inFlight.has(sessionId)) return failure('An agent of this chat is already being stopped');
  inFlight.add(sessionId);
  try {
    const target: Target = await findTarget(source, sessionId, agentId);
    return target.ok ? await stopTarget(source, target.chat, target.agent) : failure(target.error);
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  } finally {
    inFlight.delete(sessionId);
  }
}

// The dialog shows descriptions, not ids, so a description shared with another live agent cannot be told apart.
async function findTarget(source: StopSource, sessionId: string, agentId: string): Promise<Target> {
  const chat: ChatSnapshot | undefined = (await source.chats()).find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return { ok: false, error: 'The chat is not open' };
  const agent: AgentSnapshot | undefined = chat.agents.find((candidate: AgentSnapshot) => candidate.id === agentId);
  if (agent === undefined || agent.state === 'done') return { ok: false, error: 'The agent already finished' };
  // A question or permission prompt owns the keyboard; /tasks would be typed into it.
  if (chat.status === 'waiting') return { ok: false, error: 'The chat is waiting for an answer; answer it first' };
  if (chat.agents.some((other: AgentSnapshot) => other.id !== agent.id && other.state !== 'done' && other.description === agent.description)) {
    return { ok: false, error: LOOKUP_ERRORS.ambiguous };
  }
  return { ok: true, chat, agent };
}

async function stopTarget(source: StopSource, chat: ChatSnapshot, agent: AgentSnapshot): Promise<ActionResult> {
  const windowPid: number | null = await findTerminalWindowPid(chat.pid);
  if (windowPid === null) return failure('Terminal window not found');
  if (!(await hasKittySocket(windowPid))) return failure('Stopping agents needs a chat opened with kitty remote control');
  const terminal: PickerTerminal = new PickerTerminal(windowPid);
  const blocker: string | null = terminalBlocker(await terminal.plainScreen());
  if (blocker !== null) return failure(blocker);
  const sent: ActionResult | null = await pressStop(new TasksDialog(terminal, windowPid), agent.description);
  if (sent !== null) return sent;
  const stopped: boolean = await waitUntilStopped((): Promise<boolean> => source.isAgentStopped(chat.sessionId, agent.id));
  return stopped ? success('socket') : failure(`The chat did not report the agent stopped within ${STOP_CONFIRM_TIMEOUT_SECONDS} s; check its window`);
}

// Returns a failure, or null once x went to the agent's details; the dialog is closed either way.
async function pressStop(dialog: TasksDialog, description: string): Promise<ActionResult | null> {
  try {
    const lookup: AgentLookup = await dialog.showAgent(description);
    if (lookup !== 'shown') return failure(LOOKUP_ERRORS[lookup]);
    return (await dialog.stopShown(description)) ? null : failure(LOOKUP_ERRORS.missing);
  } finally {
    await dialog.close();
  }
}
