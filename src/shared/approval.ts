// A chat asking, through Orbit's request_approval tool, for the user's go-ahead on something they keep for
// themselves: putting work on main, or cutting a release.
export type ApprovalAction = 'main' | 'release';

export const APPROVAL_ACTIONS: readonly ApprovalAction[] = ['main', 'release'];

// Discuss answers nothing: the request goes away and the user talks it over in the chat. Always approves this one
// and every later request from the same chat.
export type ApprovalAnswer = 'approve' | 'always' | 'deny' | 'discuss';

const APPROVAL_ANSWERS: readonly ApprovalAnswer[] = ['approve', 'always', 'deny', 'discuss'];

export interface ApprovalRequest {
  readonly action: ApprovalAction;
  readonly summary: string;
  readonly requestedAt: number;
}

// One or two sentences; anything longer is cut, so the bar above the chat never grows into a page.
export const MAX_SUMMARY_LENGTH: number = 400;

export const APPROVAL_TITLES: Readonly<Record<ApprovalAction, string>> = { main: 'Push to main', release: 'New release' };

export function isApprovalAction(value: unknown): value is ApprovalAction {
  return APPROVAL_ACTIONS.includes(value as ApprovalAction);
}

export function isApprovalAnswer(value: unknown): value is ApprovalAnswer {
  return APPROVAL_ANSWERS.includes(value as ApprovalAnswer);
}
