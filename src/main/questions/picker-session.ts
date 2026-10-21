import type { ActionResult, QuestionState } from '../../shared/types';
import { failure, success } from '../terminal-input';
import type { PickerAccess } from './chat-picker';
import { pickerAccess } from './chat-picker';
import { withPickerRoom } from './picker-room';
import type { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { ANSWER_TIMEOUT_SECONDS } from './question-lookup';

export type PickerWork = (terminal: PickerTerminal, sessionId: string) => Promise<ActionResult>;

// Chats whose picker is being driven; a second click would interleave keys into the same picker.
const inFlight: Set<string> = new Set();

// Runs one answer against a waiting chat's terminal, never two at once for the same chat.
export async function exclusively(source: QuestionSource, sessionId: unknown, work: PickerWork): Promise<ActionResult> {
  if (typeof sessionId !== 'string') return failure('Unknown chat');
  if (inFlight.has(sessionId)) return failure('An answer is already being sent to this chat');
  inFlight.add(sessionId);
  try {
    const access: PickerAccess = await pickerAccess(source, sessionId);
    if (!access.ok) return failure(access.error);
    const terminal: PickerTerminal = access.terminal;
    // A chat window tiled small shows only part of the picker; it gets room for as long as the answer takes.
    return await withPickerRoom(terminal.target, (): Promise<ActionResult> => work(terminal, sessionId));
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  } finally {
    inFlight.delete(sessionId);
  }
}

export function recordedOutcome(state: QuestionState | null): ActionResult {
  if (state === 'answered') return success('socket');
  if (state === null) return failure(`The chat did not record the answer within ${ANSWER_TIMEOUT_SECONDS} s; check its window`);
  return failure('The chat recorded the question as declined');
}
