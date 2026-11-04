import type { ActionResult, PermissionOption, PickerPermissionView } from '../../../shared/types';
import { element } from '../../dom';
import { WARNING_ICON } from '../../icons';
import { ProblemLine } from './problem-line';
import { settleAction } from './settle-action';

// What the card can do in the chat's terminal.
export interface PermissionActions {
  answer(fingerprint: string, option: number): Promise<ActionResult>;
  // Says Yes and has Orbit say Yes to every later permission prompt of this chat.
  alwaysAllow(fingerprint: string): Promise<ActionResult>;
  // Called after the answer went through, so the card goes without waiting for a poll.
  moved(): void;
  goToChat(): void;
}

const TITLE: string = 'Permission needed';
const SENDING_LABEL: string = 'Sending…';
// "No" and "No, and tell Claude what to do differently": the answers that stop the tool, drawn as the safe choice.
const REFUSAL: RegExp = /^no\b/i;
const ALWAYS_LABEL: string = 'Always approve';
const ALWAYS_HINT: string = 'Say Yes now, and have Orbit say Yes to every later permission prompt of this chat';
// Only the plain Yes is repeated by itself; "Yes, and don't ask again" would change the chat's own settings.
const PLAIN_YES: RegExp = /^yes$/i;

// A tool permission prompt read off the chat's terminal, drawn in red: it asks to let something run, and Claude Code's
// own warnings (a risky rm, an edit outside the project) come with it.
export class PermissionCard {
  readonly root: HTMLElement = element('section', 'question-card permission-card is-pending');
  private readonly problem: ProblemLine;
  private readonly buttons: HTMLButtonElement[];
  private isSending: boolean = false;

  constructor(view: PickerPermissionView, private readonly actions: PermissionActions) {
    this.problem = new ProblemLine((): void => actions.goToChat());
    this.buttons = view.options.map((option: PermissionOption) => this.optionButton(view, option));
    if (view.options.some((option: PermissionOption) => PLAIN_YES.test(option.label.trim()))) this.buttons.unshift(this.alwaysButton(view));
    const answers: HTMLDivElement = element('div', 'permission-options');
    answers.append(...this.buttons);
    this.root.append(head(view), ...body(view), element('p', 'permission-question', view.question), answers, this.problem.root);
  }

  private optionButton(view: PickerPermissionView, option: PermissionOption): HTMLButtonElement {
    const isRefusal: boolean = REFUSAL.test(option.label);
    const button: HTMLButtonElement = element('button', `button permission-option${isRefusal ? '' : ' is-allow'}`, option.label);
    button.type = 'button';
    button.addEventListener('click', (): void => this.optionButtonClick(view, option, button));
    return button;
  }

  private alwaysButton(view: PickerPermissionView): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', 'button permission-option permission-always', ALWAYS_LABEL);
    button.type = 'button';
    button.title = ALWAYS_HINT;
    button.addEventListener('click', (): void => void this.send(button, ALWAYS_LABEL, (): Promise<ActionResult> => this.actions.alwaysAllow(view.fingerprint)));
    return button;
  }

  private optionButtonClick(view: PickerPermissionView, option: PermissionOption, button: HTMLButtonElement): void {
    void this.send(button, option.label, (): Promise<ActionResult> => this.actions.answer(view.fingerprint, option.number));
  }

  private async send(button: HTMLButtonElement, label: string, answer: () => Promise<ActionResult>): Promise<void> {
    if (this.isSending) return;
    this.setSending(true, button, SENDING_LABEL);
    const result: ActionResult = await settleAction(answer());
    if (result.ok) return this.actions.moved();
    this.problem.show(result.error ?? 'Could not send the answer');
    this.setSending(false, button, label);
  }

  private setSending(sending: boolean, button: HTMLButtonElement, label: string): void {
    this.isSending = sending;
    this.root.classList.toggle('is-sending', sending);
    this.buttons.forEach((candidate: HTMLButtonElement): void => void (candidate.disabled = sending));
    button.textContent = label;
  }
}

function head(view: PickerPermissionView): HTMLElement {
  const header: HTMLElement = element('header', 'question-head');
  const badge: HTMLSpanElement = element('span', 'question-badge');
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = WARNING_ICON;
  header.append(badge, element('span', 'question-title', TITLE));
  if (view.title !== null) header.append(element('span', 'question-count permission-tool', view.title));
  return header;
}

function body(view: PickerPermissionView): HTMLElement[] {
  const parts: HTMLElement[] = [];
  if (view.description !== null) parts.push(element('p', 'permission-description', view.description));
  if (view.detail !== null) parts.push(element('pre', 'permission-detail', view.detail));
  view.warnings.forEach((warning: string): void => void parts.push(element('p', 'permission-warning', warning)));
  return parts;
}
