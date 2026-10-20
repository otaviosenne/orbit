import type { ChatSnapshot, QuestionPicker } from '../../shared/types';
import { hasKittySocket } from '../kitty-remote';
import { findTerminalWindowPid } from '../terminal-window';
import { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { parsePicker } from './screen/picker-parser';

export type PickerAccess = { readonly ok: true; readonly terminal: PickerTerminal } | { readonly ok: false; readonly error: string };

// Only a chat that is waiting on the user can be showing a picker, and only its kitty socket lets Orbit read it.
export async function pickerAccess(source: QuestionSource, sessionId: unknown): Promise<PickerAccess> {
  if (typeof sessionId !== 'string') return denied('Unknown chat');
  const chat: ChatSnapshot | undefined = (await source.chats()).find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return denied('The chat is not open');
  if (chat.status !== 'waiting') return denied('The chat is not waiting for an answer');
  const windowPid: number | null = await findTerminalWindowPid(chat.pid);
  if (windowPid === null) return denied('Terminal window not found');
  if (!(await hasKittySocket(windowPid))) return denied('Answering needs a chat opened with kitty remote control');
  return { ok: true, terminal: new PickerTerminal(windowPid) };
}

// Reading never sends a key: it only captures the screen.
export async function readQuestionPicker(source: QuestionSource, sessionId: unknown): Promise<QuestionPicker | null> {
  try {
    const access: PickerAccess = await pickerAccess(source, sessionId);
    return access.ok ? parsePicker(await access.terminal.screen()) : null;
  } catch (error: unknown) {
    console.error('Could not read the question picker:', error);
    return null;
  }
}

function denied(error: string): PickerAccess {
  return { ok: false, error };
}
