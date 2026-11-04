import type { ActionResult, MessageItem, QueuePull, RadarApi } from '../../../shared/types';
import { element } from '../../dom';
import { PENCIL_ICON } from '../../icons';
import { showToast } from '../../toast';

export type QueueEditApi = Pick<RadarApi, 'pullQueue' | 'releaseQueue' | 'sendQueueNow'>;

const EDIT_CLASS: string = 'queued-edit';
const SEND_NOW_CLASS: string = 'queued-send-now';
const SEND_NOW_LABEL: string = 'Send now';

// The Edit button of a message still waiting in the chat's queue; its text rides on it, to focus that one.
export function queuedEditButton(message: MessageItem): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', EDIT_CLASS);
  button.type = 'button';
  button.title = 'Edit before the chat takes it in';
  button.setAttribute('aria-label', 'Edit queued message');
  button.innerHTML = PENCIL_ICON;
  button.dataset['queuedText'] = message.text;
  return button;
}

// Ctrl+Enter's button: every queued message carries one, and only the last shows it (styles.css), since it sends them
// all; the reply being written stops, as in the chat window.
export function queuedSendNowButton(): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', SEND_NOW_CLASS, SEND_NOW_LABEL);
  button.type = 'button';
  button.title = 'Stop the reply being written and send the queued messages now';
  return button;
}

interface HeldQueue {
  readonly sessionId: string;
  readonly panel: HTMLElement;
}

// Editing the queue works as Up does in the chat window: the pencil pulls every queued message into the chat's
// input, where it cannot take them in, and the thread ends in a form with one box per message. Save types them back
// as edited (an emptied one is left out); Cancel, or leaving the chat, types them back as they were.
export class QueuedEdits {
  private held: HeldQueue | null = null;
  private isPulling: boolean = false;

  constructor(
    root: HTMLElement,
    private readonly api: QueueEditApi,
    private readonly sessionId: () => string | null,
    private readonly changed: () => void,
  ) {
    root.addEventListener('click', (event: MouseEvent): void => this.onClick(event));
    window.addEventListener('beforeunload', (): void => this.release(null));
  }

  // Part of the thread's render key, so the form shows and goes with a render.
  key(): string {
    return this.held === null ? '' : `queue-edit:${this.held.sessionId}`;
  }

  render(): HTMLElement[] {
    return this.held !== null && this.held.sessionId === this.sessionId() ? [this.held.panel] : [];
  }

  // Leaving the chat puts its messages back unchanged, so none is left in its input.
  release(texts: readonly string[] | null): void {
    const held: HeldQueue | null = this.held;
    if (held === null) return;
    this.held = null;
    this.changed();
    void this.api.releaseQueue(held.sessionId, texts).then(
      (result: ActionResult): void => this.report(result, 'Could not put the messages back in the queue'),
      (error: unknown): void => this.report({ ok: false, method: null, error: String(error) }, 'Could not put the messages back in the queue'),
    );
  }

  private onClick(event: MouseEvent): void {
    const sendNow: HTMLButtonElement | null = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(`.${SEND_NOW_CLASS}`) : null;
    if (sendNow !== null) return void this.sendNow(sendNow);
    const button: HTMLElement | null = event.target instanceof Element ? event.target.closest<HTMLElement>(`.${EDIT_CLASS}`) : null;
    const sessionId: string | null = this.sessionId();
    if (button === null || sessionId === null || this.isPulling || this.held !== null) return;
    void this.pull(sessionId, button.dataset['queuedText'] ?? '');
  }

  private async sendNow(button: HTMLButtonElement): Promise<void> {
    const sessionId: string | null = this.sessionId();
    if (sessionId === null || button.disabled || this.held !== null) return;
    button.disabled = true;
    const result: ActionResult = await this.api.sendQueueNow(sessionId).catch((error: unknown): ActionResult => ({ ok: false, method: null, error: String(error) }));
    button.disabled = false;
    this.report(result, 'Could not send the queued messages');
  }

  private async pull(sessionId: string, clickedText: string): Promise<void> {
    this.isPulling = true;
    const pull: QueuePull = await this.api.pullQueue(sessionId).catch((error: unknown): QueuePull => ({ ok: false, prompts: [], error: String(error) }));
    this.isPulling = false;
    if (!pull.ok) return showToast({ title: 'Could not edit the message', note: pull.error ?? undefined, isProblem: true });
    this.held = { sessionId, panel: this.renderPanel(pull.prompts, clickedText) };
    if (sessionId !== this.sessionId()) return this.release(null);
    this.changed();
    this.held.panel.querySelector<HTMLTextAreaElement>('.is-focus')?.focus();
  }

  private renderPanel(prompts: readonly string[], clickedText: string): HTMLElement {
    const panel: HTMLDivElement = element('div', 'queued-edit-form');
    const fields: HTMLTextAreaElement[] = prompts.map((prompt: string) => queuedField(prompt));
    (fields.find((field: HTMLTextAreaElement) => field.value === clickedText) ?? fields[0])?.classList.add('is-focus');
    const save = (): void => this.release(fields.map((field: HTMLTextAreaElement) => field.value));
    const cancel = (): void => this.release(null);
    // As in the composer: Escape leaves the messages as they were, Ctrl+Enter saves.
    panel.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === 'Escape') cancel();
      else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) save();
    });
    panel.append(element('span', 'message-meta', 'Editing queued messages · the chat waits for them'), ...fields, actionRow(cancel, save));
    return panel;
  }

  private report(result: ActionResult, title: string): void {
    if (!result.ok) showToast({ title, note: result.error ?? undefined, isProblem: true });
  }
}

function queuedField(text: string): HTMLTextAreaElement {
  const field: HTMLTextAreaElement = element('textarea', 'queued-edit-field');
  field.value = text;
  field.setAttribute('aria-label', 'Queued message');
  return field;
}

function actionRow(cancel: () => void, save: () => void): HTMLElement {
  const row: HTMLDivElement = element('div', 'queued-edit-actions');
  const cancelButton: HTMLButtonElement = element('button', 'button', 'Cancel');
  const saveButton: HTMLButtonElement = element('button', 'button button-primary', 'Save');
  cancelButton.type = 'button';
  saveButton.type = 'button';
  cancelButton.addEventListener('click', cancel);
  saveButton.addEventListener('click', save);
  row.append(cancelButton, saveButton);
  return row;
}
