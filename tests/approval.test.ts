import { describe, expect, it } from 'vitest';
import { parseApproval } from '../src/core/approvals/approval-file';
import { isOpen } from '../src/core/approvals/approval-reader';
import type { ApprovalChat } from '../src/core/approvals/approval-reader';
import { approvalReply } from '../src/core/approvals/approval-reply';
import type { ApprovalRequest } from '../src/shared/approval';
import { MAX_SUMMARY_LENGTH } from '../src/shared/approval';

const REQUEST: ApprovalRequest = { action: 'main', summary: 'Merges the usage badge fix.', requestedAt: 5_000 };
const CHAT: ApprovalChat = { pid: 7, startedAt: 1_000, status: 'idle', statusUpdatedAt: 6_000 };

describe('approval requests', () => {
  it('reads a request the MCP server wrote, trimming and capping its summary', () => {
    expect(parseApproval({ action: 'release', summary: '  v2.0  ', requestedAt: 3 })).toEqual({ action: 'release', summary: 'v2.0', requestedAt: 3 });
    expect(parseApproval({ ...REQUEST, summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1) })?.summary).toHaveLength(MAX_SUMMARY_LENGTH);
  });

  it('refuses anything that is not a request', () => {
    expect(parseApproval(null)).toBeNull();
    expect(parseApproval({ ...REQUEST, action: 'deploy' })).toBeNull();
    expect(parseApproval({ ...REQUEST, summary: '   ' })).toBeNull();
    expect(parseApproval({ action: 'main', summary: 'x' })).toBeNull();
  });

  it('stays open while the chat rests after asking', () => {
    expect(isOpen(REQUEST, CHAT)).toBe(true);
    // Still finishing the turn that asked.
    expect(isOpen(REQUEST, { ...CHAT, status: 'busy', statusUpdatedAt: 4_000 })).toBe(true);
  });

  it('closes once the chat works again, or when it belongs to an earlier process with the same pid', () => {
    expect(isOpen(REQUEST, { ...CHAT, status: 'busy', statusUpdatedAt: 9_000 })).toBe(false);
    expect(isOpen(REQUEST, { ...CHAT, startedAt: 8_000 })).toBe(false);
  });

  it('answers with the action and the summary, so the chat knows which request it settles', () => {
    expect(approvalReply(REQUEST, true)).toBe('Approved in Orbit: go ahead and push to main. (Merges the usage badge fix.)');
    expect(approvalReply({ ...REQUEST, action: 'release' }, false)).toBe(
      'Not approved in Orbit: do not cut the release. (Merges the usage badge fix.) Wait for my next message.',
    );
  });
});
