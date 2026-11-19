import type { TypingAnswer } from '../../shared/typing-answer';
import type { TypingRequest } from '../../shared/typing-request';
import { isFullyCopied } from '../../shared/typing-request';
import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { element } from '../dom';
import type { TypingInput } from './typing-inputs';
import { COPIED_CLASS, typingInput } from './typing-inputs';

export interface TypingActions {
  answer(pid: number, answer: TypingAnswer): Promise<ActionResult>;
  report(result: ActionResult, successText: string): void;
}

interface ShownRequest {
  readonly pid: number;
  readonly request: TypingRequest;
  // Which request this is; a copy keeps the request but changes its key, so the bar redraws with the field done.
  readonly key: string;
  // Which request it was regardless of copies, so declining or the last copy keep it hidden for good.
  readonly requestKey: string;
}

const TITLE: string = 'Secret for the chat';
const HINT: string = 'Copy one field at a time: Orbit puts it on the PC clipboard (kept out of history) and the chat pastes it.';
const SENDING_CLASS: string = 'is-sending';
// The radar normally sees the chat go busy on the paste within a poll or two; this only rescues a bar whose busy phase
// was never seen, so it is generous.
const PASTE_WAIT_FALLBACK_MS: number = 30_000;

// A field was copied and the chat has not pasted it yet. Until its request leaves the screen (the chat went busy) or
// the fallback passes, the bar stays hidden: another copy would replace the clipboard under that paste.
interface PasteWait {
  readonly pid: number;
  readonly requestKey: string;
  readonly until: number;
}

// A chat's request_typing, pinned under the header like a question: one text input and Copy button per field the
// chat asked for. A copy puts that field on the PC's clipboard for the chat to paste; the text is cleared before it
// is sent and never reaches the chat. After a copy the bar hides until the chat has pasted, then comes back for the
// fields still to copy.
export class TypingBar {
  private shown: ShownRequest | null = null;
  private readonly answered: Set<string> = new Set();
  private rows: readonly TypingInput[] = [];
  private pasteWait: PasteWait | null = null;

  constructor(private readonly root: HTMLElement, private readonly actions: TypingActions) {}

  show(chat: ChatSnapshot | null): void {
    const request: TypingRequest | null = chat?.typing ?? null;
    this.endPasteWait(chat, request);
    if (chat === null || request === null) return this.hide();
    const requestKey: string = `${chat.pid}:${request.requestedAt}`;
    if (this.answered.has(requestKey) || this.pasteWait?.requestKey === requestKey) return this.hide();
    const key: string = `${requestKey}:${request.copied.join(',')}`;
    if (this.shown?.key === key) return;
    this.shown = { pid: chat.pid, request, key, requestKey };
    this.render(request);
  }

  private render(request: TypingRequest): void {
    const text: HTMLElement = element('div', 'approval-text');
    text.append(element('span', 'approval-title', TITLE));
    if (request.title !== null) text.append(element('span', 'approval-summary', request.title));
    text.append(element('span', 'typing-hint', HINT));
    this.rows = request.fields.map((field, index: number): TypingInput => typingInput(field, request.copied.includes(index)));
    this.rows.forEach((row: TypingInput, index: number): void => this.wireRow(row, index));
    const fields: HTMLElement = element('div', 'typing-fields');
    fields.append(...this.rows.map((row: TypingInput): HTMLElement => row.row));
    const decline: HTMLButtonElement = element('button', 'button typing-decline', 'Decline');
    decline.type = 'button';
    decline.addEventListener('click', (): void => void this.send('decline', 'Declined'));
    const controls: HTMLElement = element('div', 'typing-controls');
    controls.append(decline);
    this.root.replaceChildren(text, fields, controls);
    this.root.hidden = false;
  }

  // Enter in an input copies that field, like pressing its button.
  private wireRow(row: TypingInput, index: number): void {
    row.copy.addEventListener('click', (): void => void this.copyField(index));
    row.input.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      void this.copyField(index);
    });
  }

  private async copyField(index: number): Promise<void> {
    const row: TypingInput | undefined = this.rows[index];
    if (row === undefined || row.copy.disabled) return;
    if (row.input.value.length === 0) return row.input.focus();
    const text: string = row.input.value;
    // Cleared before the answer comes back, so the text is gone from the page whatever happens next.
    row.input.value = '';
    const label: string = this.shown?.request.fields[index]?.label ?? '';
    await this.send({ field: index, text }, `Copied "${label}": the chat pastes it now`);
  }

  private async send(answer: TypingAnswer, successText: string): Promise<void> {
    const shown: ShownRequest | null = this.shown;
    if (shown === null || this.root.classList.contains(SENDING_CLASS)) return;
    this.setSending(true);
    const result: ActionResult = await this.actions.answer(shown.pid, answer);
    this.setSending(false);
    this.actions.report(result, successText);
    if (!result.ok) return;
    if (isLastAnswer(shown.request, answer)) this.answered.add(shown.requestKey);
    else this.pasteWait = { pid: shown.pid, requestKey: shown.requestKey, until: Date.now() + PASTE_WAIT_FALLBACK_MS };
    if (this.shown?.requestKey === shown.requestKey) this.hide();
  }

  // Only a snapshot of the waiting chat itself counts: another chat on screen says nothing about its paste.
  private endPasteWait(chat: ChatSnapshot | null, request: TypingRequest | null): void {
    const wait: PasteWait | null = this.pasteWait;
    if (wait === null || chat?.pid !== wait.pid) return;
    if (request === null || Date.now() >= wait.until) this.pasteWait = null;
  }

  private setSending(sending: boolean): void {
    this.root.classList.toggle(SENDING_CLASS, sending);
    for (const button of this.root.querySelectorAll('button')) button.disabled = sending || button.classList.contains(COPIED_CLASS);
  }

  private hide(): void {
    this.shown = null;
    for (const row of this.rows) row.input.value = '';
    this.rows = [];
    this.root.hidden = true;
    this.root.replaceChildren();
  }
}

// Declining, or copying the one field left, answers the whole request.
function isLastAnswer(request: TypingRequest, answer: TypingAnswer): boolean {
  if (answer === 'decline') return true;
  return isFullyCopied({ ...request, copied: [...request.copied, answer.field] });
}
