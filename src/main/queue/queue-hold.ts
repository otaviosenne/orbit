import type { LiveQueue } from '../../core/chat-radar';
import { readTail } from '../../core/file-reader';
import type { QueuedPrompt } from '../../core/queue/prompt-queue';
import { poppedPrompts } from '../../core/queue/queued-prompt-reader';
import { withoutPastedWrappers } from '../../core/pasted-content';
import { imageTokenPattern } from '../../shared/image-tokens';
import { isSessionId } from '../../shared/session-id';
import type { ActionResult, QueuePull } from '../../shared/types';
import { hasKittySocket, kittySocketPath, submitThroughKitty } from '../kitty-remote';
import { delay, runCommand } from '../run-command';
import { failure, success } from '../terminal-input';
import { findTerminalWindowPid } from '../terminal-window';
import { freeInput, holdInput } from './held-inputs';

export interface QueueSource {
  liveQueue(sessionId: string): Promise<LiveQueue | null>;
}

// How long Claude Code gets to log the prompts an Up press pulled back into its input.
const POP_TIMEOUT_MS: number = 2000;
const POP_POLL_MS: number = 100;
const POP_READ_BYTES: number = 256 * 1024;
// Ctrl+U clears only the line the cursor is on and Backspace then joins the line above, so the pair clears one line.
const CLEAR_ONE_LINE: string = '\\x15\\x7f';
// Lines cleared beyond those counted, for a paste Claude Code shows differently from how it logged it.
const CLEAR_MARGIN_LINES: number = 2;
// With nothing left in the queue, Up recalls the last prompt instead, of unknown length; this many lines clear it.
const RECALLED_LINES: number = 200;
// An edit left open this long (a closed window, a lost phone) puts the prompts back as they were.
const HOLD_LIMIT_MS: number = 15 * 60_000;
const ALREADY_SENT: string = 'The chat already took the message in';

// A chat's queue pulled into its input for editing: there the chat cannot take it in until it is typed back.
interface Hold {
  readonly windowPid: number;
  readonly popped: readonly string[];
  readonly expiry: NodeJS.Timeout;
}

const holds: Map<string, Hold> = new Map();
// Chats whose input is being driven; a second request would interleave its keys with the first.
const inFlight: Set<string> = new Set();

// As Up does in the chat window: every queued prompt moves into the input, out of the chat's reach while it is edited.
export function pullQueue(source: QueueSource, sessionId: unknown): Promise<QueuePull> {
  return exclusively(sessionId, async (session: string): Promise<QueuePull> => {
    const held: Hold | undefined = holds.get(session);
    if (held !== undefined) return pulled(held.popped);
    const queue: LiveQueue | null = await source.liveQueue(session);
    if (queue === null || queue.prompts.length === 0) return refused(ALREADY_SENT);
    // Typing a prompt again keeps its text but not the images pasted into it.
    if (queue.prompts.some(hasImages)) return refused('A queue holding images can only be edited in the chat window');
    const windowPid: number | null = await findTerminalWindowPid(queue.chatPid);
    if (windowPid === null || !(await hasKittySocket(windowPid))) return refused('Editing needs a chat opened with kitty remote control');
    const pressedAt: number = Date.now();
    await kitty(windowPid, ['send-key', 'up']);
    const popped: string[] = await waitForPopped(queue.transcript, pressedAt);
    if (popped.length === 0) {
      await clearInput(windowPid, RECALLED_LINES);
      return refused(ALREADY_SENT);
    }
    holds.set(session, { windowPid, popped, expiry: setTimeout((): void => void releaseQueue(session, null), HOLD_LIMIT_MS) });
    holdInput(windowPid);
    return pulled(popped);
  }, (error: string): QueuePull => refused(error));
}

// Types the held prompts back into the queue, in order: `texts` as edited (an emptied one is left out), or null for
// the prompts as they were.
export function releaseQueue(sessionId: unknown, texts: unknown): Promise<ActionResult> {
  return exclusively(sessionId, async (session: string): Promise<ActionResult> => {
    const held: Hold | undefined = holds.get(session);
    if (held === undefined) return failure('Nothing of this chat is being edited');
    holds.delete(session);
    clearTimeout(held.expiry);
    freeInput(held.windowPid);
    await clearInput(held.windowPid, linesOf(held.popped));
    for (const prompt of finalPrompts(held.popped, texts)) await submitThroughKitty(held.windowPid, prompt, { asPaste: true, attachments: [] });
    return success('socket');
  }, failure);
}

// The prompts to type back: the edited texts when they line up with what was pulled, otherwise the originals.
export function finalPrompts(popped: readonly string[], texts: unknown): string[] {
  const edited: readonly unknown[] | null = Array.isArray(texts) && texts.length === popped.length ? texts : null;
  return popped
    .map((prompt: string, index: number) => (typeof edited?.[index] === 'string' ? (edited[index] as string) : typedText(prompt)).trim())
    .filter((prompt: string) => prompt.length > 0);
}

async function exclusively<T>(sessionId: unknown, work: (session: string) => Promise<T>, fail: (error: string) => T): Promise<T> {
  if (!isSessionId(sessionId)) return fail('Unknown chat');
  if (inFlight.has(sessionId)) return fail("This chat's queue is already being changed");
  inFlight.add(sessionId);
  try {
    return await work(sessionId);
  } catch (error: unknown) {
    return fail(error instanceof Error ? error.message : String(error));
  } finally {
    inFlight.delete(sessionId);
  }
}

async function waitForPopped(transcript: string, since: number): Promise<string[]> {
  const deadline: number = since + POP_TIMEOUT_MS;
  for (;;) {
    const popped: string[] = poppedPrompts((await readTail(transcript, POP_READ_BYTES)).text, since);
    if (popped.length > 0 || Date.now() > deadline) return popped;
    await delay(POP_POLL_MS);
  }
}

function clearInput(windowPid: number, lines: number): Promise<string> {
  return kitty(windowPid, ['send-text', CLEAR_ONE_LINE.repeat(lines)]);
}

function kitty(windowPid: number, command: readonly string[]): Promise<string> {
  return runCommand('kitty', ['@', '--to', `unix:${kittySocketPath(windowPid)}`, ...command]);
}

// The input holds the prompts one under the other.
function linesOf(popped: readonly string[]): number {
  return popped.reduce((lines: number, prompt: string) => lines + prompt.split('\n').length, CLEAR_MARGIN_LINES);
}

// What was typed, without the wrapper Claude Code puts around a paste.
function typedText(prompt: string): string {
  return withoutPastedWrappers(prompt).trim();
}

function hasImages(prompt: QueuedPrompt): boolean {
  return imageTokenPattern().test(prompt.content);
}

function pulled(popped: readonly string[]): QueuePull {
  return { ok: true, prompts: popped.map(typedText), error: null };
}

function refused(error: string): QueuePull {
  return { ok: false, prompts: [], error };
}
