import { element } from '../../dom';
import { ConfirmPopover } from '../confirm-popover';

const CLOSE_LABEL: string = 'Close chat';

// The popover's last row: closes the chat, after the same Close / Cancel confirmation used elsewhere.
export class CloseChatAction {
  readonly root: HTMLDivElement = element('div', 'chat-settings-danger');
  private readonly confirm: ConfirmPopover = new ConfirmPopover();

  constructor(onConfirm: () => void) {
    const button: HTMLButtonElement = element('button', 'chat-settings-close', CLOSE_LABEL);
    button.type = 'button';
    button.addEventListener('click', (): void => this.confirm.open(button, { confirmLabel: CLOSE_LABEL, onConfirm }));
    this.root.append(button);
  }

  dismiss(): void {
    this.confirm.dismiss();
  }
}
