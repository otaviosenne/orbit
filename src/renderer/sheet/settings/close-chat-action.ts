import { element } from '../../dom';
import { ConfirmPopover } from '../confirm-popover';

const CLOSE_LABEL: string = 'Close chat';

// The popover's last row: closes the chat, after the same Close / Cancel confirmation used elsewhere.
export class CloseChatAction {
  readonly root: HTMLDivElement = element('div', 'chat-settings-danger');
  private readonly confirm: ConfirmPopover = new ConfirmPopover();

  private readonly button: HTMLButtonElement = element('button', 'chat-settings-close', CLOSE_LABEL);

  constructor(private readonly onConfirm: () => void) {
    this.button.type = 'button';
    this.button.addEventListener('click', (): void => this.ask());
    this.root.append(this.button);
  }

  // Anchored on the button, so the popover holding it must be open first.
  ask(): void {
    this.confirm.open(this.button, { confirmLabel: CLOSE_LABEL, onConfirm: this.onConfirm });
  }

  dismiss(): void {
    this.confirm.dismiss();
  }
}
