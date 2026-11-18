import { readFile, rename, unlink } from 'node:fs/promises';
import { typingPath } from '../../core/typing/typing-file';
import { typingReply } from '../../shared/typing-reply';
import type { TypingAnswer, TypingRequest } from '../../shared/typing-request';
import { answerFits, parseTypingRequest } from '../../shared/typing-request';
import type { ActionResult } from '../../shared/types';
import { sendMessage } from '../chat-actions';
import { typeOnPc } from '../remote-typing/type-on-pc';
import { failure } from '../terminal-input';

const ALREADY_ANSWERED: ActionResult = failure('This request was already answered');
const WRONG_FIELD_COUNT: ActionResult = failure('Fill every field of the request, and only those');
const DECLINED: ActionResult = { ok: true, method: null, error: null };
const CLAIM_SUFFIX: string = '.answering';

// Claimed first (a rename only one caller wins), so the desktop and a phone never type twice. An answer that does
// not fit the claimed request, or a failed typing, puts the request back on screen; the chat then hears only that it
// was typed or declined, never the text.
export async function answerTyping(pid: number, answer: TypingAnswer): Promise<ActionResult> {
  const path: string = typingPath(pid);
  const claimed: string = `${path}${CLAIM_SUFFIX}`;
  const request: TypingRequest | null = await claim(path, claimed);
  if (request === null) return ALREADY_ANSWERED;
  const typed: ActionResult = await typeAnswer(request, answer);
  if (!typed.ok) {
    await rename(claimed, path).catch((): void => undefined);
    return typed;
  }
  await unlink(claimed).catch((): void => undefined);
  return sendMessage(pid, typingReply(request, answer), []);
}

async function typeAnswer(request: TypingRequest, answer: TypingAnswer): Promise<ActionResult> {
  if (!answerFits(request, answer)) return WRONG_FIELD_COUNT;
  return answer === 'decline' ? DECLINED : typeOnPc(answer);
}

async function claim(path: string, claimed: string): Promise<TypingRequest | null> {
  try {
    await rename(path, claimed);
    return parseTypingRequest(JSON.parse(await readFile(claimed, 'utf8')) as unknown);
  } catch {
    return null;
  }
}
