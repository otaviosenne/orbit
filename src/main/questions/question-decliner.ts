import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { delay } from '../run-command';
import { failure, success } from '../terminal-input';
import { keys } from './picker-keys';
import { exclusively } from './picker-session';
import type { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { stripAnsi } from './screen/ansi-line';
import { showsPicker } from './screen/picker-evidence';

// Escape is how the chat's own picker is dismissed: Claude is told the user declined to answer.
const DISMISS_KEY: string = 'escape';
const DISMISS_TIMEOUT_MS: number = 5000;
const DISMISS_POLL_MS: number = 250;

// The card's X: closes the waiting question without an answer, as Esc does in the chat window.
export function declineQuestion(source: QuestionSource, sessionId: unknown): Promise<ActionResult> {
  return exclusively(source, sessionId, async (terminal: PickerTerminal, session: string): Promise<ActionResult> => {
    // Escape anywhere else would interrupt the chat's work, so it is only sent with the picker positively on screen.
    if (!showsPicker(stripAnsi(await terminal.screen()))) return failure('The question is not showing in the chat\'s terminal');
    await terminal.run([keys(DISMISS_KEY)]);
    return (await leftWaiting(source, session)) ? success('socket') : failure('The question is still waiting; check the chat window');
  });
}

async function leftWaiting(source: QuestionSource, sessionId: string): Promise<boolean> {
  const deadline: number = Date.now() + DISMISS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const chat: ChatSnapshot | undefined = (await source.chats()).find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
    if (chat?.status !== 'waiting') return true;
    await delay(DISMISS_POLL_MS);
  }
  return false;
}
