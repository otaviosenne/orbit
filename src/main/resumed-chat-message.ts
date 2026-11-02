import { stat } from 'node:fs/promises';
import { readTail } from '../core/file-reader';
import { listLiveSessions } from '../core/session-registry';
import { TranscriptLocator } from '../core/transcript-locator';
import type { SessionRecord } from '../core/session-registry';
import type { ActionResult } from '../shared/types';
import { PickerTerminal } from './questions/picker-terminal';
import { delay } from './run-command';
import { failure, submitToChat } from './terminal-input';
import { findTerminalWindowPid } from './terminal-window';

// The mark Claude Code draws at the start of its input box.
const INPUT_MARK: string = '❯';
const CHECK_MS: number = 500;
// Resuming re-draws the whole history and starts the MCP servers; a long chat on a slow start can take this long.
const READY_TIMEOUT_MS: number = 30_000;
// A delivered message is written to the transcript at once; this leaves room for a slow disk.
const LANDED_TIMEOUT_MS: number = 5000;
// Enough of the message to recognise it once JSON has escaped the rest.
const MESSAGE_PROBE_CHARS: number = 40;
// A chat that just came up still drops input now and then while it finishes starting.
const MAX_ATTEMPTS: number = 3;
// A resumed chat registers itself within a few seconds; MCP servers that are slow to start can stretch that.
const REOPEN_TIMEOUT_MS: number = 45_000;

// A prompt given to an interactive `claude --resume` is never sent, so a message for a reopened chat is typed in
// once the session is back up.
export async function sendAfterResume(sessionId: string, text: string): Promise<ActionResult> {
  const pid: number | null = await reopenedPid(sessionId);
  return pid === null ? failure('Reopened, but it did not come up in time to take the message') : sendToResumedChat(pid, sessionId, text);
}

async function reopenedPid(sessionId: string): Promise<number | null> {
  for (let waited: number = 0; waited < REOPEN_TIMEOUT_MS; waited += CHECK_MS) {
    const sessions: SessionRecord[] = await listLiveSessions().catch((): SessionRecord[] => []);
    const session: SessionRecord | undefined = sessions.find((candidate: SessionRecord) => candidate.sessionId === sessionId);
    if (session !== undefined) return session.pid;
    await delay(CHECK_MS);
  }
  return null;
}

// Sends a message to a chat that was just resumed. Text typed before it finishes starting can vanish, so the message
// counts as delivered only once it shows in the transcript; otherwise Enter is pressed again if the text is still in
// the box, or the text is sent again if it is gone.
async function sendToResumedChat(chatPid: number, sessionId: string, text: string): Promise<ActionResult> {
  const transcript: string | null = await new TranscriptLocator().locate(sessionId);
  if (transcript === null) return failure('Transcript not found');
  const windowPid: number | null = await findTerminalWindowPid(chatPid).catch((): null => null);
  if (windowPid === null) return failure('Terminal window not found');
  const terminal: PickerTerminal = new PickerTerminal(windowPid);
  if (!(await isPromptReady(terminal))) return failure('The chat did not finish starting');
  for (let attempt: number = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const before: number = await sizeOf(transcript);
    const sent: ActionResult = (await inputLine(terminal)).length > 0 ? await pressEnter(terminal) : await submitToChat(chatPid, text, 'message');
    if (!sent.ok) return sent;
    if (await landed(transcript, before, text)) return sent;
  }
  return failure('The chat did not take the message');
}

// Up once its input box is drawn and the screen has stopped changing between two looks.
async function isPromptReady(terminal: PickerTerminal): Promise<boolean> {
  let previous: string | null = null;
  for (let waited: number = 0; waited < READY_TIMEOUT_MS; waited += CHECK_MS) {
    const screen: string | null = await terminal.plainScreen().catch((): null => null);
    if (screen !== null && screen.includes(INPUT_MARK) && screen === previous) return true;
    previous = screen;
    await delay(CHECK_MS);
  }
  return false;
}

// What sits in the input box: the text after the last input mark on screen.
async function inputLine(terminal: PickerTerminal): Promise<string> {
  const screen: string = await terminal.plainScreen().catch((): string => '');
  const line: string | undefined = screen.split('\n').filter((candidate: string) => candidate.trimStart().startsWith(INPUT_MARK)).at(-1);
  return line === undefined ? '' : line.trimStart().slice(INPUT_MARK.length).trim();
}

async function pressEnter(terminal: PickerTerminal): Promise<ActionResult> {
  try {
    await terminal.run([{ kind: 'keys', keys: ['enter'] }]);
    return { ok: true, method: 'socket', error: null };
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}

// Only what was written after the send counts: an earlier restart may have left the same message further up.
async function landed(transcript: string, before: number, text: string): Promise<boolean> {
  const probe: string = text.slice(0, MESSAGE_PROBE_CHARS);
  for (let waited: number = 0; waited < LANDED_TIMEOUT_MS; waited += CHECK_MS) {
    await delay(CHECK_MS);
    const written: number = (await sizeOf(transcript)) - before;
    if (written <= 0) continue;
    const added: string = (await readTail(transcript, written).catch((): { text: string } => ({ text: '' }))).text;
    if (added.includes(probe)) return true;
  }
  return false;
}

async function sizeOf(path: string): Promise<number> {
  return (await stat(path).catch((): { size: number } => ({ size: 0 }))).size;
}
