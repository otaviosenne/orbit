import type { ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { suspendStops, suspendWarning } from '../../suspend/suspend-stops';
import { ConfirmPopover } from '../confirm-popover';

const RESTART_LABEL: string = 'Restart';

// Beside Suspend and Close chat: closes the chat and resumes the same session, so it picks up skills, MCP servers,
// CLAUDE.md and settings changed since it started. Like Suspend, it asks first only when that would stop work.
export class RestartChatAction {
  readonly root: HTMLButtonElement = element('button', 'chat-settings-end chat-settings-restart', RESTART_LABEL);
  private readonly confirm: ConfirmPopover = new ConfirmPopover();

  constructor(
    private readonly chat: () => ChatSnapshot | null,
    private readonly onConfirm: () => void,
  ) {
    this.root.type = 'button';
    this.root.title = 'Reopen this chat so it loads new skills, MCP servers, CLAUDE.md and settings';
    this.root.addEventListener('click', (): void => this.ask());
  }

  ask(): void {
    const chat: ChatSnapshot | null = this.chat();
    if (chat === null) return;
    const warning: string | null = suspendWarning(suspendStops(chat));
    if (warning === null) return this.onConfirm();
    this.confirm.open(this.root, { confirmLabel: RESTART_LABEL, note: warning, onConfirm: this.onConfirm });
  }

  dismiss(): void {
    this.confirm.dismiss();
  }
}
