import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { typingPath } from '../../core/typing/typing-file';
import type { FieldCopy, TypingAnswer } from '../../shared/typing-answer';
import { answerFits } from '../../shared/typing-answer';
import { copiedReply, declinedReply } from '../../shared/typing-reply';
import type { TypingRequest } from '../../shared/typing-request';
import { isFullyCopied, parseTypingRequest, withCopied } from '../../shared/typing-request';
import type { ActionResult } from '../../shared/types';
import { sendMessage } from '../chat-actions';
import { copySecret } from '../secret-clipboard/secret-clipboard';
import { failure } from '../terminal-input';

const ALREADY_ANSWERED: ActionResult = failure('This request was already answered');
const NOT_A_FIELD: ActionResult = failure('That field is not in the request, or was already copied');
const COPY_FAILED: ActionResult = failure('Copying to the PC clipboard failed');
const CLAIM_SUFFIX: string = '.answering';

interface ClaimedRequest {
  // The file as the MCP server wrote it, so fields Orbit does not read (the session id) survive a write back.
  readonly raw: Record<string, unknown>;
  readonly request: TypingRequest;
}

// Claimed first (a rename only one caller wins), so the desktop and a phone never copy the same field twice. A copy
// that does not fit the claimed request, or fails, puts the request back on screen. After a copy the request goes
// back with that field marked done until every field is copied; the chat hears only which field, never the text.
export async function answerTyping(pid: number, answer: TypingAnswer): Promise<ActionResult> {
  const path: string = typingPath(pid);
  const claimed: string = `${path}${CLAIM_SUFFIX}`;
  const taken: ClaimedRequest | null = await claim(path, claimed);
  if (taken === null) return ALREADY_ANSWERED;
  if (!answerFits(taken.request, answer)) return putBack(claimed, path, NOT_A_FIELD);
  if (answer === 'decline') return finish(pid, claimed, declinedReply(taken.request));
  return copyField(pid, { path, claimed }, taken, answer);
}

interface RequestPaths {
  readonly path: string;
  readonly claimed: string;
}

async function copyField(pid: number, paths: RequestPaths, taken: ClaimedRequest, copy: FieldCopy): Promise<ActionResult> {
  try {
    await copySecret(copy.text);
  } catch {
    return putBack(paths.claimed, paths.path, COPY_FAILED);
  }
  const updated: TypingRequest = withCopied(taken.request, copy.field, Date.now());
  const reply: string = copiedReply(updated, copy.field);
  if (isFullyCopied(updated)) return finish(pid, paths.claimed, reply);
  // Back in place before the chat hears of it, so the bar is there for the next field once the chat has pasted.
  await writeFile(paths.claimed, JSON.stringify({ ...taken.raw, copied: updated.copied, copiedAt: updated.copiedAt }));
  await rename(paths.claimed, paths.path);
  return sendMessage(pid, reply, []);
}

async function finish(pid: number, claimed: string, reply: string): Promise<ActionResult> {
  await unlink(claimed).catch((): void => undefined);
  return sendMessage(pid, reply, []);
}

async function putBack(claimed: string, path: string, result: ActionResult): Promise<ActionResult> {
  await rename(claimed, path).catch((): void => undefined);
  return result;
}

async function claim(path: string, claimed: string): Promise<ClaimedRequest | null> {
  try {
    await rename(path, claimed);
    const raw: unknown = JSON.parse(await readFile(claimed, 'utf8')) as unknown;
    const request: TypingRequest | null = parseTypingRequest(raw);
    return request === null ? null : { raw: raw as Record<string, unknown>, request };
  } catch {
    return null;
  }
}
