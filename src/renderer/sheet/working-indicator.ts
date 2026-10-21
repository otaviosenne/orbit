import type { TurnProgress } from '../../shared/types';
import { element, requireElement } from '../dom';
import { formatDuration } from '../format';
import { STOP_ICON } from '../icons';
import { renderSpinner } from '../spinner';
import { ConfirmPopover } from './confirm-popover';
import { SPINNER_VERBS } from './spinner-verbs';
import { keepingThreadEnd } from './thread-end';

const TICK_MS: number = 1000;
const THOUSAND: number = 1000;
// One decimal like Claude Code's "1.5k tokens".
const TOKEN_DECIMALS: number = 1;

// The line Claude Code prints while it works ("✻ Crystallizing… (23s · ↓ 1.5k tokens)"), shown above the composer.
export class WorkingIndicator {
  private readonly verb: HTMLSpanElement = element('span', 'working-verb');
  private readonly meta: HTMLSpanElement = element('span', 'working-meta');
  // The thread reserves extra room at its end while this line shows (see .sheet:has(.working-indicator) in styles.css).
  private readonly thread: HTMLElement = requireElement('#sheet-messages');
  private readonly stop: HTMLButtonElement = element('button', 'working-stop');
  private readonly confirm: ConfirmPopover = new ConfirmPopover();
  private timer: number | undefined;
  private startedAt: number = 0;
  private outputTokens: number = 0;

  // onInterrupt: stops the chat's current turn, as Escape does in its terminal; asked for confirmation first.
  constructor(private readonly root: HTMLElement, private readonly onInterrupt: () => void) {
    root.hidden = true;
    this.stop.type = 'button';
    this.stop.title = 'Interrupt Claude';
    this.stop.setAttribute('aria-label', 'Interrupt Claude');
    this.stop.innerHTML = STOP_ICON;
    this.stop.addEventListener('click', (): void => this.askToInterrupt());
  }

  get isShown(): boolean {
    return !this.root.hidden;
  }

  // The stop button's own confirmation, also opened by the I shortcut.
  askToInterrupt(): void {
    if (this.isShown) this.confirm.open(this.stop, { confirmLabel: 'Interrupt', onConfirm: this.onInterrupt });
  }

  show(progress: TurnProgress | null, fallbackStart: number): void {
    this.startedAt = progress?.startedAt ?? fallbackStart;
    this.outputTokens = progress?.outputTokens ?? 0;
    if (this.root.hidden) {
      this.root.replaceChildren(renderSpinner(), this.verb, this.meta, this.stop);
      this.setVisible(true);
      this.timer = window.setInterval((): void => this.renderText(), TICK_MS);
    }
    this.renderText();
  }

  hide(): void {
    this.confirm.dismiss();
    window.clearInterval(this.timer);
    if (!this.root.hidden) this.setVisible(false);
  }

  private setVisible(visible: boolean): void {
    keepingThreadEnd(this.thread, (): void => {
      this.root.hidden = !visible;
    });
  }

  private renderText(): void {
    // The verb follows the turn: a stable pick per turn, a new one when the next turn starts.
    this.verb.textContent = `${SPINNER_VERBS[this.startedAt % SPINNER_VERBS.length] ?? 'Working'}…`;
    const tokens: string = this.outputTokens > 0 ? ` · ↓ ${formatTokens(this.outputTokens)} tokens` : '';
    this.meta.textContent = `(${formatDuration(Date.now() - this.startedAt)}${tokens})`;
  }
}

function formatTokens(tokens: number): string {
  return tokens < THOUSAND ? String(tokens) : `${(tokens / THOUSAND).toFixed(TOKEN_DECIMALS)}k`;
}
