import type { ActionResult, PermissionOption, PickerPermissionView } from '../../shared/types';
import { alwaysAllowPermissions } from '../../core/permissions/always-allowed';
import { isSessionId } from '../../core/approvals/always-approved';
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
// The plain "Yes": not "Yes, and don't ask again", which would change the chat's own settings.
const PLAIN_YES: RegExp = /^yes$/i;

type OptionPick = (view: PickerPermissionView) => PermissionOption | undefined;

// Picks one of a permission prompt's numbered answers. Typing its number chooses it at once, as in the chat window.
export function answerPermission(source: QuestionSource, sessionId: unknown, fingerprint: unknown, option: unknown): Promise<ActionResult> {
  return answerOnScreen(source, sessionId, fingerprint, (view: PickerPermissionView) => view.options.find((candidate: PermissionOption) => candidate.number === option));
}

// "Always approve": this prompt gets its plain Yes, and every later one of the chat is answered by the auto-allower.
export async function alwaysAllowPermission(source: QuestionSource, sessionId: unknown, fingerprint: unknown): Promise<ActionResult> {
  if (!isSessionId(sessionId)) return failure('Unknown chat');
  const result: ActionResult = await answerOnScreen(source, sessionId, fingerprint, plainYes);
  if (result.ok) await alwaysAllowPermissions(sessionId);
  return result;
}

// Answers whatever permission prompt the chat shows with its plain Yes, for a chat set to Always approve.
export function allowShownPermission(source: QuestionSource, sessionId: string): Promise<ActionResult> {
  return answerOnScreen(source, sessionId, null, plainYes);
}

export function plainYes(view: PickerPermissionView): PermissionOption | undefined {
  return view.options.find((option: PermissionOption) => PLAIN_YES.test(option.label.trim()));
}

// A null fingerprint takes whatever prompt is showing. The window keeps its size: shrinking the font rewraps the prompt
// and can leave stale rows behind, so it would no longer match the one the user saw.
function answerOnScreen(source: QuestionSource, sessionId: unknown, fingerprint: unknown, pick: OptionPick): Promise<ActionResult> {
  return exclusively(source, sessionId, async (terminal: PickerTerminal): Promise<ActionResult> => {
    const view: PickerPermissionView | null = parsePermission(await terminal.history());
    if (view === null || (fingerprint !== null && view.fingerprint !== fingerprint)) return failure(SCREEN_CHANGED);
    const option: PermissionOption | undefined = pick(view);
    if (option === undefined) return failure('That answer is not on the prompt');
    await terminal.run([{ kind: 'text', text: String(option.number) }]);
    return (await promptGone(terminal, view)) ? success('socket') : failure('The prompt did not take the answer; check the chat window');
  }, false);
}

async function promptGone(terminal: PickerTerminal, before: PickerPermissionView): Promise<boolean> {
  const deadline: number = Date.now() + PROMPT_GONE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (parsePermission(await terminal.history())?.fingerprint !== before.fingerprint) return true;
    await delay(PROMPT_GONE_POLL_MS);
  }
  return false;
}
