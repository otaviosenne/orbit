import type { ApprovalAction, ApprovalRequest } from '../../shared/approval';

const DOING: Readonly<Record<ApprovalAction, string>> = { main: 'push to main', release: 'cut the release' };

// What Orbit types into the chat for an answer; it repeats the summary so the chat knows which request it settles.
export function approvalReply(request: ApprovalRequest, approved: boolean): string {
  const doing: string = DOING[request.action];
  return approved
    ? `Approved in Orbit: go ahead and ${doing}. (${request.summary})`
    : `Not approved in Orbit: do not ${doing}. (${request.summary}) Wait for my next message.`;
}
