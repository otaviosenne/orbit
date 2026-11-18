import { readFile, rename, unlink } from 'node:fs/promises';
import { typingPath } from '../../core/typing/typing-file';
import type { TypingAnswer, TypingRequest } from '../../shared/typing-request';
import { parseTypingRequest, typingReply } from '../../shared/typing-request';
import type { ActionResult } from '../../shared/types';
import { sendMessage } from '../chat-actions';
import { typeOnPc } from '../remote-typing/type-on-pc';
import { failure } from '../terminal-input';

const ALREADY_ANSWERED: ActionResult = failure('This request was already answered');
const CLAIM_SUFFIX: string = '.answering';

// Claimed first (a rename only one caller wins), so the desktop and a phone never type twice. A failed typing puts
// the request back on screen; the chat then hears only that it was typed or declined, never the text.
export async function answerTyping(pid: number, answer: TypingAnswer): Promise<ActionResult> {
  const path: string = typingPath(pid);
  const claimed: string = `${path}${CLAIM_SUFFIX}`;
  const request: TypingRequest | null = await claim(path, claimed);
  if (request === null) return ALREADY_ANSWERED;
  if (answer !== 'decline') {
    const typed: ActionResult = await typeOnPc(answer);
    if (!typed.ok) {
      await rename(claimed, path).catch((): void => undefined);
      return typed;
    }
  }
  await unlink(claimed).catch((): void => undefined);
  return sendMessage(pid, typingReply(request, answer), []);
}

async function claim(path: string, claimed: string): Promise<TypingRequest | null> {
  try {
    await rename(path, claimed);
    return parseTypingRequest(JSON.parse(await readFile(claimed, 'utf8')) as unknown);
  } catch {
    return null;
  }
}
