import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isAlwaysApproved } from '../core/approvals/always-approved';
import { approvalPath } from '../core/approvals/approval-file';
import { approvalReply } from '../core/approvals/approval-reply';
import type { ApprovalAction } from '../shared/approval';
import { APPROVAL_ACTIONS, isApprovalAction, MAX_SUMMARY_LENGTH } from '../shared/approval';

export const APPROVAL_TOOL_NAME: string = 'request_approval';

export const APPROVAL_TOOL = {
  name: APPROVAL_TOOL_NAME,
  title: 'Ask the user for approval in Orbit',
  description:
    'Ask the user for permission to push or merge to main, or to cut a new release. Orbit shows your summary above ' +
    'this chat with Approve, Always approve, Deny and Discuss buttons. After calling it, end your turn right away and ' +
    'do nothing else: the answer arrives as the user\'s next message. The one exception: a chat the user always ' +
    'approves gets "Approved in Orbit" as the result itself, and then goes ahead in the same turn.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: APPROVAL_ACTIONS, description: 'main: push or merge to main. release: cut a new release.' },
      summary: {
        type: 'string',
        maxLength: MAX_SUMMARY_LENGTH,
        description: 'What goes in, in one sentence (two at most), in the language the user writes to you.',
      },
    },
    required: ['action', 'summary'],
    additionalProperties: false,
  },
} as const;

export interface ToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
  readonly isError: boolean;
}

const SHOWN: string =
  'Shown in Orbit above this chat. End your turn now without doing anything else; the user\'s answer arrives as ' +
  'their next message. Also say in one line, in your reply, that you are waiting for approval in Orbit.';

const ALWAYS_NOTE: string = 'The user always approves this chat in Orbit, so carry on now in this same turn.';

// The chat is the process that started this server: Claude Code runs it directly, with no shell in between.
export async function requestApproval(
  args: Record<string, unknown>,
  chatPid: number,
  now: number = Date.now(),
  sessionId: string | null = currentSessionId(),
): Promise<ToolResult> {
  const { action, summary } = args;
  if (!isApprovalAction(action)) return problem(`action must be one of: ${APPROVAL_ACTIONS.join(', ')}`);
  if (typeof summary !== 'string' || summary.trim().length === 0) return problem('summary must say what goes in');
  if (await isAlwaysApproved(sessionId)) return answer(`${approvalReply({ action, summary: summary.trim(), requestedAt: now }, true)} ${ALWAYS_NOTE}`);
  await saveRequest(chatPid, action, summary.trim(), now, sessionId);
  return answer(SHOWN);
}

function currentSessionId(): string | null {
  return process.env['CLAUDE_CODE_SESSION_ID'] ?? null;
}

// Written whole and then renamed, so Orbit never reads half a request.
async function saveRequest(chatPid: number, action: ApprovalAction, summary: string, requestedAt: number, sessionId: string | null): Promise<void> {
  const path: string = approvalPath(chatPid);
  const draft: string = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(draft, JSON.stringify({ action, summary, requestedAt, sessionId }));
  await rename(draft, path);
}

function answer(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: false };
}

function problem(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}
