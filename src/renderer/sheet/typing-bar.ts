import type { TypingTarget } from '../../shared/remote-typing';
import type { TypingAnswer, TypingRequest } from '../../shared/typing-request';
import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { element } from '../dom';
import type { TypingInput } from './typing-inputs';
import { typingInput } from './typing-inputs';

export interface TypingActions {
  answer(pid: number, answer: TypingAnswer): Promise<ActionResult>;
  target(): Promise<TypingTarget>;
  report(result: ActionResult, successText: string): void;
}

interface ShownRequest {
  readonly pid: number;
  readonly key: string;
}

const TITLE: string = 'Type on the PC';
const SENDING_CLASS: string = 'is-sending';
// Focus can move on the PC while the bar waits, so where the text would land is checked again this often.
const TARGET_POLL_MS: number = 2000;

// A chat's request_typing, pinned under the header like a question: one text input per field the chat asked for,
// which Orbit types into the browser fields on the PC in order, Tab between them. The texts are cleared before they
// are sent and never reach the chat.
export class TypingBar {
  private shown: ShownRequest | null = null;
  private readonly answered: Set<string> = new Set();
  private inputs: readonly HTMLInputElement[] = [];
  private readonly enter: HTMLInputElement = enterSwitch();
  private readonly where: HTMLElement = element('span', 'typing-target');
  private readonly typeButton: HTMLButtonElement = barButton('Type on PC', 'button button-primary');
  private targetTimer: number | null = null;

  constructor(private readonly root: HTMLElement, private readonly actions: TypingActions) {
    this.typeButton.addEventListener('click', (): void => void this.typeTexts());
  }

  show(chat: ChatSnapshot | null): void {
    const request: TypingRequest | null = chat?.typing ?? null;
    const key: string | null = chat === null || request === null ? null : `${chat.pid}:${request.requestedAt}`;
    if (chat === null || request === null || key === null || this.answered.has(key)) return this.hide();
    if (this.shown?.key === key) return;
    this.shown = { pid: chat.pid, key };
    this.render(request);
  }

  private render(request: TypingRequest): void {
    const text: HTMLElement = element('div', 'approval-text');
    text.append(element('span', 'approval-title', TITLE));
    if (request.title !== null) text.append(element('span', 'approval-summary', request.title));
    text.append(this.where);
    const rows: TypingInput[] = request.fields.map(typingInput);
    this.inputs = rows.map((row: TypingInput): HTMLInputElement => row.input);
    this.inputs.forEach((input: HTMLInputElement, index: number): void => this.onEnter(input, index));
    const fields: HTMLElement = element('div', 'typing-fields');
    fields.append(...rows.map((row: TypingInput): HTMLLabelElement => row.row));
    // Off for every new request: an Enter the user did not ask for submits a form half filled in.
    this.enter.checked = false;
    const enterLabel: HTMLLabelElement = element('label', 'typing-enter');
    enterLabel.append(this.enter, document.createTextNode('Press Enter after'));
    const decline: HTMLButtonElement = barButton('Decline', 'button typing-decline');
    decline.addEventListener('click', (): void => void this.send('decline', 'Declined'));
    const controls: HTMLElement = element('div', 'typing-controls');
    controls.append(this.typeButton, enterLabel, decline);
    this.root.replaceChildren(text, fields, controls);
    this.root.hidden = false;
    this.followTarget();
  }

  // Enter moves on to the next input, and in the last one types them all, like a form would.
  private onEnter(input: HTMLInputElement, index: number): void {
    input.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const next: HTMLInputElement | undefined = this.inputs[index + 1];
      if (next === undefined) void this.typeTexts();
      else next.focus();
    });
  }

  private async typeTexts(): Promise<void> {
    if (this.typeButton.disabled) return;
    const empty: HTMLInputElement | undefined = this.inputs.find((input: HTMLInputElement): boolean => input.value.length === 0);
    if (empty !== undefined) return empty.focus();
    const texts: string[] = this.inputs.map((input: HTMLInputElement): string => input.value);
    // Cleared before the answer comes back, so the texts are gone from the page whatever happens next.
    this.clearInputs();
    await this.send({ texts, pressEnter: this.enter.checked }, 'Typed on the PC');
  }

  private clearInputs(): void {
    for (const input of this.inputs) input.value = '';
  }

  private async send(answer: TypingAnswer, successText: string): Promise<void> {
    const shown: ShownRequest | null = this.shown;
    if (shown === null || this.root.classList.contains(SENDING_CLASS)) return;
    this.setSending(true);
    const result: ActionResult = await this.actions.answer(shown.pid, answer);
    this.setSending(false);
    this.actions.report(result, successText);
    if (!result.ok) return;
    this.answered.add(shown.key);
    if (this.shown?.key === shown.key) this.hide();
  }

  private followTarget(): void {
    this.stopFollowing();
    const check = async (): Promise<void> => {
      const target: TypingTarget | null = await this.actions.target().catch((): null => null);
      if (this.shown === null) return;
      this.where.textContent = target === null ? 'Checking the PC…' : target.accepts ? `Types into ${target.app}${target.title ? ` · ${target.title}` : ''}` : (target.refusal ?? 'Not here');
      this.where.classList.toggle('is-refused', target?.accepts !== true);
      this.typeButton.disabled = target?.accepts !== true;
    };
    void check();
    this.targetTimer = window.setInterval((): void => void check(), TARGET_POLL_MS);
  }

  private stopFollowing(): void {
    if (this.targetTimer !== null) window.clearInterval(this.targetTimer);
    this.targetTimer = null;
  }

  private setSending(sending: boolean): void {
    this.root.classList.toggle(SENDING_CLASS, sending);
    for (const button of this.root.querySelectorAll('button')) button.disabled = sending;
  }

  private hide(): void {
    this.stopFollowing();
    this.shown = null;
    this.clearInputs();
    this.inputs = [];
    this.root.hidden = true;
    this.root.replaceChildren();
  }
}

function enterSwitch(): HTMLInputElement {
  const toggle: HTMLInputElement = element('input', 'typing-enter-switch');
  toggle.type = 'checkbox';
  toggle.checked = false;
  return toggle;
}

function barButton(label: string, className: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', className, label);
  button.type = 'button';
  return button;
}
