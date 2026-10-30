import { readFile, rename, unlink } from 'node:fs/promises';
import type { ApprovalAnswer, ApprovalRequest } from '../../shared/approval';
import type { ActionResult } from '../../shared/types';
import { alwaysApprove } from '../../core/approvals/always-approved';
import { approvalPath, approvalSessionId, parseApproval } from '../../core/approvals/approval-file';
import { approvalReply } from '../../core/approvals/approval-reply';
import { sendMessage } from '../chat-actions';
import { failure } from '../terminal-input';

const ALREADY_ANSWERED: ActionResult = failure('This request was already answered');
const DISCUSSED: ActionResult = { ok: true, method: null, error: null };
const CLAIM_SUFFIX: string = '.answering';

interface ClaimedRequest {
  readonly request: ApprovalRequest;
  readonly sessionId: string | null;
}

// The request is taken first (a rename, which only one caller wins), so the desktop and a phone pressing at the
// same moment never send two answers. A reply that could not be typed puts the request back on screen.
export async function answerApproval(pid: number, answer: ApprovalAnswer): Promise<ActionResult> {
  const path: string = approvalPath(pid);
  const claimed: string = `${path}${CLAIM_SUFFIX}`;
  const claimedRequest: ClaimedRequest | null = await claim(path, claimed);
  if (claimedRequest === null) return ALREADY_ANSWERED;
  if (answer === 'discuss') return forget(claimed, DISCUSSED);
  const { request, sessionId } = claimedRequest;
  const result: ActionResult = await sendMessage(pid, approvalReply(request, answer !== 'deny'), []);
  // Remembered only once this request really went through, so a failed press leaves the chat asking as before.
  if (result.ok && answer === 'always' && sessionId !== null) await alwaysApprove(sessionId).catch((error: unknown): void => console.error('Could not remember Always approve', error));
  if (result.ok) return forget(claimed, result);
  await rename(claimed, path).catch((): void => undefined);
  return result;
}

async function claim(path: string, claimed: string): Promise<ClaimedRequest | null> {
  try {
    await rename(path, claimed);
    const raw: unknown = JSON.parse(await readFile(claimed, 'utf8')) as unknown;
    const request: ApprovalRequest | null = parseApproval(raw);
    return request === null ? null : { request, sessionId: approvalSessionId(raw) };
  } catch {
    return null;
  }
}

async function forget(claimed: string, result: ActionResult): Promise<ActionResult> {
  await unlink(claimed).catch((): void => undefined);
  return result;
}
