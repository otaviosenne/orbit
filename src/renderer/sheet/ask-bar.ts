import type { AskAnswer, AskOption, AskRequest } from '../../shared/ask';
import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { element } from '../dom';

export interface AskActions {
  answer(pid: number, answer: AskAnswer): Promise<ActionResult>;
  // Reply in chat leaves the answer to the conversation, so the composer takes the keyboard.
  discuss(): void;
  report(result: ActionResult, successText: string): void;
}

interface ShownAsk {
  readonly pid: number;
  readonly key: string;
}

const TITLE: string = 'Question';
const REPLY_IN_CHAT: string = 'Reply in chat';
const SENDING_CLASS: string = 'is-sending';

// A chat's question through Orbit's ask_user tool, pinned under the header like an approval: the question and one
// button per option (the chat's recommended one first, in the primary style), plus Reply in chat for anything else.
export class AskBar {
  private shown: ShownAsk | null = null;
  // Answered here: the next poll may still carry the ask before its file is gone.
  private readonly answered: Set<string> = new Set();

  constructor(private readonly root: HTMLElement, private readonly actions: AskActions) {}

  show(chat: ChatSnapshot | null): void {
    const request: AskRequest | null = chat?.ask ?? null;
    const key: string | null = chat === null || request === null ? null : `${chat.pid}:${request.requestedAt}`;
    if (chat === null || request === null || key === null || this.answered.has(key)) return this.hide();
    // Rebuilt only for a new ask, so a press is never cut short by a poll.
    if (this.shown?.key === key) return;
    this.shown = { pid: chat.pid, key };
    this.render(request);
  }

  private render(request: AskRequest): void {
    const text: HTMLElement = element('div', 'approval-text');
    text.append(element('span', 'approval-title', TITLE), element('span', 'approval-summary', request.question));
    const options: HTMLElement = element('div', 'ask-options');
    request.options.forEach((option: AskOption, index: number): void => {
      options.append(this.optionButton(option, index));
    });
    const reply: HTMLButtonElement = element('button', 'button ask-reply', REPLY_IN_CHAT);
    reply.type = 'button';
    reply.addEventListener('click', (): void => void this.answer('chat', REPLY_IN_CHAT));
    options.append(reply);
    this.root.replaceChildren(text, options);
    this.root.hidden = false;
  }

  private optionButton(option: AskOption, index: number): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', `button ask-option${index === 0 ? ' button-primary' : ''}`);
    button.type = 'button';
    button.append(element('span', 'ask-option-label', option.label));
    if (option.description.length > 0) {
      button.append(element('span', 'ask-option-description', option.description));
      button.title = option.description;
    }
    button.addEventListener('click', (): void => void this.answer(index, option.label));
    return button;
  }

  private async answer(answer: AskAnswer, label: string): Promise<void> {
    const shown: ShownAsk | null = this.shown;
    if (shown === null || this.root.classList.contains(SENDING_CLASS)) return;
    this.setSending(true);
    const result: ActionResult = await this.actions.answer(shown.pid, answer);
    this.setSending(false);
    this.actions.report(result, answer === 'chat' ? 'Over to the chat' : `Answered: ${label}`);
    if (!result.ok) return;
    this.answered.add(shown.key);
    if (this.shown?.key === shown.key) this.hide();
    if (answer === 'chat') this.actions.discuss();
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
