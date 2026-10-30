import type { ApprovalAnswer, ApprovalRequest } from '../../shared/approval';
import { APPROVAL_TITLES } from '../../shared/approval';
import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { element } from '../dom';

export interface ApprovalActions {
  answer(pid: number, answer: ApprovalAnswer): Promise<ActionResult>;
  // Discuss leaves the chat to the conversation, so the composer takes the keyboard.
  discuss(): void;
  report(result: ActionResult, successText: string): void;
}

interface ShownRequest {
  readonly pid: number;
  readonly key: string;
}

const BUTTONS: readonly { readonly answer: ApprovalAnswer; readonly label: string; readonly className: string }[] = [
  { answer: 'discuss', label: 'Discuss', className: 'button' },
  { answer: 'deny', label: 'Deny', className: 'button' },
  { answer: 'approve', label: 'Approve', className: 'button button-primary' },
];

const ANSWER_TEXTS: Readonly<Record<ApprovalAnswer, string>> = { approve: 'Approved', deny: 'Denied', discuss: 'Over to the chat' };
const SENDING_CLASS: string = 'is-sending';

// A chat's request for the go-ahead on main or a release, in blue under the header: the summary and three answers.
export class ApprovalBar {
  private shown: ShownRequest | null = null;
  // Answered here: the next poll may still carry the request before its file is gone.
  private readonly answered: Set<string> = new Set();

  constructor(private readonly root: HTMLElement, private readonly actions: ApprovalActions) {}

  show(chat: ChatSnapshot | null): void {
    const request: ApprovalRequest | null = chat?.approval ?? null;
    const key: string | null = chat === null || request === null ? null : `${chat.pid}:${request.requestedAt}`;
    if (chat === null || request === null || key === null || this.answered.has(key)) return this.hide();
    // Rebuilt only for a new request, so a press is never cut short by a poll.
    if (this.shown?.key === key) return;
    this.shown = { pid: chat.pid, key };
    this.render(request);
  }

  private render(request: ApprovalRequest): void {
    const text: HTMLElement = element('div', 'approval-text');
    text.append(element('span', 'approval-title', APPROVAL_TITLES[request.action]), element('span', 'approval-summary', request.summary));
    const buttons: HTMLElement = element('div', 'approval-buttons');
    for (const { answer, label, className } of BUTTONS) {
      const button: HTMLButtonElement = element('button', className, label);
      button.type = 'button';
      button.addEventListener('click', (): void => void this.answer(answer));
      buttons.append(button);
    }
    this.root.replaceChildren(text, buttons);
    this.root.hidden = false;
  }

  private async answer(answer: ApprovalAnswer): Promise<void> {
    const shown: ShownRequest | null = this.shown;
    if (shown === null || this.root.classList.contains(SENDING_CLASS)) return;
    this.setSending(true);
    const result: ActionResult = await this.actions.answer(shown.pid, answer);
    this.setSending(false);
    this.actions.report(result, ANSWER_TEXTS[answer]);
    if (!result.ok) return;
    this.answered.add(shown.key);
    if (this.shown?.key === shown.key) this.hide();
    if (answer === 'discuss') this.actions.discuss();
  }

  private setSending(sending: boolean): void {
    this.root.classList.toggle(SENDING_CLASS, sending);
    for (const button of this.root.querySelectorAll('button')) button.disabled = sending;
  }

  private hide(): void {
    this.shown = null;
    this.root.hidden = true;
    this.root.replaceChildren();
  }
}
