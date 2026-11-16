import { readFile, rename, unlink } from 'node:fs/promises';
import { askPath } from '../../core/asks/ask-file';
import type { AskAnswer, AskRequest } from '../../shared/ask';
import { askReply, isAskChoice, parseAsk } from '../../shared/ask';
import type { ActionResult } from '../../shared/types';
import { sendMessage } from '../chat-actions';
import { failure } from '../terminal-input';

const ALREADY_ANSWERED: ActionResult = failure('This question was already answered');
const NOT_AN_OPTION: ActionResult = failure('Not one of the options');
const SET_ASIDE: ActionResult = { ok: true, method: null, error: null };
const CLAIM_SUFFIX: string = '.answering';

// Claimed first (a rename only one caller wins), so the desktop and a phone pressing at once never send two
// answers; an answer that could not be typed puts the question back on screen.
export async function answerAsk(pid: number, choice: AskAnswer): Promise<ActionResult> {
  const path: string = askPath(pid);
  const claimed: string = `${path}${CLAIM_SUFFIX}`;
  const request: AskRequest | null = await claim(path, claimed);
  if (request === null) return ALREADY_ANSWERED;
  if (choice === 'chat') return forget(claimed, SET_ASIDE);
  if (!isAskChoice(request, choice)) {
    await rename(claimed, path).catch((): void => undefined);
    return NOT_AN_OPTION;
  }
  const result: ActionResult = await sendMessage(pid, askReply(request, choice), []);
  if (result.ok) return forget(claimed, result);
  await rename(claimed, path).catch((): void => undefined);
  return result;
}

async function claim(path: string, claimed: string): Promise<AskRequest | null> {
  try {
    await rename(path, claimed);
    return parseAsk(JSON.parse(await readFile(claimed, 'utf8')) as unknown);
  } catch {
    return null;
  }
}

async function forget(claimed: string, result: ActionResult): Promise<ActionResult> {
  await unlink(claimed).catch((): void => undefined);
  return result;
}
