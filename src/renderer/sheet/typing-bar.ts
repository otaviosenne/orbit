import type { TypingTarget } from '../../shared/remote-typing';
import { MAX_TYPED_LENGTH } from '../../shared/remote-typing';
import type { TypingAnswer, TypingRequest } from '../../shared/typing-request';
import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { element } from '../dom';

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

// A chat's request_typing, pinned under the header like a question: a text field whose text Orbit types into the
// browser field focused on the PC. The text is cleared before it is sent and never reaches the chat.
export class TypingBar {
  private shown: ShownRequest | null = null;
  private readonly answered: Set<string> = new Set();
  private readonly field: HTMLInputElement = passwordField();
  private readonly enter: HTMLInputElement = enterSwitch();
  private readonly where: HTMLElement = element('span', 'typing-target');
  private readonly typeButton: HTMLButtonElement = barButton('Type on PC', 'button button-primary');
  private targetTimer: number | null = null;

  constructor(private readonly root: HTMLElement, private readonly actions: TypingActions) {
    this.typeButton.addEventListener('click', (): void => void this.typeText());
    this.field.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === 'Enter') void this.typeText();
    });
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
    text.append(element('span', 'approval-title', TITLE), element('span', 'approval-summary', request.label), this.where);
    const enterLabel: HTMLLabelElement = element('label', 'typing-enter');
    enterLabel.append(this.enter, document.createTextNode('Press Enter after'));
    const decline: HTMLButtonElement = barButton('Decline', 'button typing-decline');
    decline.addEventListener('click', (): void => void this.send('decline', 'Declined'));
    const controls: HTMLElement = element('div', 'typing-controls');
    controls.append(this.field, this.typeButton, enterLabel, decline);
    this.field.value = '';
    this.root.replaceChildren(text, controls);
    this.root.hidden = false;
    this.followTarget();
  }

  private async typeText(): Promise<void> {
    const text: string = this.field.value;
    if (text.length === 0 || this.typeButton.disabled) return;
    // Cleared before the answer comes back, so the text is gone from the page whatever happens next.
    this.field.value = '';
    await this.send({ text, pressEnter: this.enter.checked }, 'Typed on the PC');
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
    this.field.value = '';
    this.root.hidden = true;
    this.root.replaceChildren();
  }
}

// Plain text on purpose: the user wants to read what they write before it is typed. No autocorrect or capitals, which
// would quietly change a password on a phone keyboard.
function passwordField(): HTMLInputElement {
  const field: HTMLInputElement = element('input', 'typing-field');
  field.type = 'text';
  field.setAttribute('autocorrect', 'off');
  field.maxLength = MAX_TYPED_LENGTH;
  field.autocomplete = 'off';
  field.spellcheck = false;
  field.setAttribute('autocapitalize', 'off');
  field.setAttribute('aria-label', 'Text to type on the PC');
  field.placeholder = 'Type it here';
  return field;
}

function enterSwitch(): HTMLInputElement {
  const toggle: HTMLInputElement = element('input', 'typing-enter-switch');
  toggle.type = 'checkbox';
  toggle.checked = true;
  return toggle;
}

function barButton(label: string, className: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', className, label);
  button.type = 'button';
  return button;
}
