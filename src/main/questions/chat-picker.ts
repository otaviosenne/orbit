import type { ChatSnapshot, PickerSetView, QuestionItem, QuestionPicker } from '../../shared/types';
import { hasKittySocket } from '../kitty-remote';
import { findTerminalWindowPid } from '../terminal-window';
import { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { pendingQuestion } from './question-lookup';
import { parsePicker } from './screen/picker-parser';

export type PickerAccess = { readonly ok: true; readonly terminal: PickerTerminal } | { readonly ok: false; readonly error: string };

// Only a chat that is waiting on the user can be showing a picker, and only its kitty socket lets Orbit reach it.
export async function pickerAccess(source: QuestionSource, sessionId: unknown): Promise<PickerAccess> {
  const chat: ChatSnapshot | string = await waitingChat(source, sessionId);
  if (typeof chat === 'string') return denied(chat);
  const windowPid: number | null = await findTerminalWindowPid(chat.pid);
  if (windowPid === null) return denied('Terminal window not found');
  if (!(await hasKittySocket(windowPid))) return denied('Answering needs a chat opened with kitty remote control');
  return { ok: true, terminal: new PickerTerminal(windowPid) };
}

// Reading never sends a key. The transcript's copy of the question wins whenever it is there: it is the whole set,
// while a small terminal shows only part of the picker. Whatever stands in the way of delivering shows on Submit.
export async function readQuestionPicker(source: QuestionSource, sessionId: unknown): Promise<QuestionPicker | null> {
  try {
    if (typeof (await waitingChat(source, sessionId)) === 'string') return null;
    const pending: QuestionItem | null = await pendingQuestion(source, sessionId as string);
    if (pending !== null) return setView(pending);
    const access: PickerAccess = await pickerAccess(source, sessionId);
    return access.ok ? parsePicker(await access.terminal.screen()) : null;
  } catch (error: unknown) {
    console.error('Could not read the question picker:', error);
    return null;
  }
}

// The chat, or why it cannot be showing a picker.
async function waitingChat(source: QuestionSource, sessionId: unknown): Promise<ChatSnapshot | string> {
  if (typeof sessionId !== 'string') return 'Unknown chat';
  const chat: ChatSnapshot | undefined = (await source.chats()).find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return 'The chat is not open';
  return chat.status === 'waiting' ? chat : 'The chat is not waiting for an answer';
}

function setView(pending: QuestionItem): PickerSetView {
  return { kind: 'set', questionId: pending.id, questions: pending.questions };
}

function denied(error: string): PickerAccess {
  return { ok: false, error };
}
