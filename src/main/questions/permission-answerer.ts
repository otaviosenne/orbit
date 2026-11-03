import type { ActionResult, PickerPermissionView } from '../../shared/types';
import { delay } from '../run-command';
import { failure, success } from '../terminal-input';
import { exclusively } from './picker-session';
import type { PickerTerminal } from './picker-terminal';
import type { QuestionSource } from './question-lookup';
import { parsePermission } from './screen/permission-parser';

// How long the prompt gets to go away once its answer was typed.
const PROMPT_GONE_TIMEOUT_MS: number = 3000;
const PROMPT_GONE_POLL_MS: number = 150;
const SCREEN_CHANGED: string = 'The permission prompt on screen changed; look at it again';

// Picks one of a permission prompt's numbered answers. Typing its number chooses it at once, as in the chat window.
export function answerPermission(source: QuestionSource, sessionId: unknown, fingerprint: unknown, option: unknown): Promise<ActionResult> {
  return exclusively(source, sessionId, async (terminal: PickerTerminal): Promise<ActionResult> => {
    const view: PickerPermissionView | null = parsePermission(await terminal.history());
    if (view === null || view.fingerprint !== fingerprint) return failure(SCREEN_CHANGED);
    if (!view.options.some((candidate) => candidate.number === option)) return failure('That answer is not on the prompt');
    await terminal.run([{ kind: 'text', text: String(option) }]);
    return (await promptGone(terminal, view)) ? success('socket') : failure('The prompt did not take the answer; check the chat window');
  });
}

async function promptGone(terminal: PickerTerminal, before: PickerPermissionView): Promise<boolean> {
  const deadline: number = Date.now() + PROMPT_GONE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (parsePermission(await terminal.history())?.fingerprint !== before.fingerprint) return true;
    await delay(PROMPT_GONE_POLL_MS);
  }
  return false;
}
