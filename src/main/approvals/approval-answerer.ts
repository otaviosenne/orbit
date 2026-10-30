import { readFile, rename, unlink } from 'node:fs/promises';
import type { ApprovalAnswer, ApprovalRequest } from '../../shared/approval';
import type { ActionResult } from '../../shared/types';
import { approvalPath, parseApproval } from '../../core/approvals/approval-file';
import { approvalReply } from '../../core/approvals/approval-reply';
import { sendMessage } from '../chat-actions';
import { failure } from '../terminal-input';

const ALREADY_ANSWERED: ActionResult = failure('This request was already answered');
const DISCUSSED: ActionResult = { ok: true, method: null, error: null };
const CLAIM_SUFFIX: string = '.answering';

// The request is taken first (a rename, which only one caller wins), so the desktop and a phone pressing at the
// same moment never send two answers. A reply that could not be typed puts the request back on screen.
export async function answerApproval(pid: number, answer: ApprovalAnswer): Promise<ActionResult> {
  const path: string = approvalPath(pid);
  const claimed: string = `${path}${CLAIM_SUFFIX}`;
  const request: ApprovalRequest | null = await claim(path, claimed);
  if (request === null) return ALREADY_ANSWERED;
  if (answer === 'discuss') return forget(claimed, DISCUSSED);
  const result: ActionResult = await sendMessage(pid, approvalReply(request, answer === 'approve'), []);
  if (result.ok) return forget(claimed, result);
  await rename(claimed, path).catch((): void => undefined);
  return result;
}

async function claim(path: string, claimed: string): Promise<ApprovalRequest | null> {
  try {
    await rename(path, claimed);
    return parseApproval(JSON.parse(await readFile(claimed, 'utf8')) as unknown);
  } catch {
    return null;
  }
}

async function forget(claimed: string, result: ActionResult): Promise<ActionResult> {
  await unlink(claimed).catch((): void => undefined);
  return result;
}
