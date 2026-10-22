import { element } from '../../dom';
import { ConfirmPopover } from '../confirm-popover';

const CLOSE_LABEL: string = 'Close chat';

// Closes the chat, after the same Close / Cancel confirmation used elsewhere.
export class CloseChatAction {
  readonly root: HTMLButtonElement = element('button', 'chat-settings-end chat-settings-close', CLOSE_LABEL);
  private readonly confirm: ConfirmPopover = new ConfirmPopover();

  constructor(private readonly onConfirm: () => void) {
    this.root.type = 'button';
    this.root.addEventListener('click', (): void => this.ask());
  }

  // Anchored on the button, so the popover holding it must be open first.
  ask(): void {
    this.confirm.open(this.root, { confirmLabel: CLOSE_LABEL, onConfirm: this.onConfirm });
  }

  dismiss(): void {
    this.confirm.dismiss();
  }
}
