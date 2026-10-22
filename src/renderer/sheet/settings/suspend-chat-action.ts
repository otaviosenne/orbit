import type { ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { SuspendPrompt } from '../../suspend/suspend-prompt';

const SUSPEND_LABEL: string = 'Suspend';

// Beside Close chat: closes the chat too, but keeps it in the board's Suspended section to come back to. It asks
// first only when that would stop work.
export class SuspendChatAction {
  readonly root: HTMLButtonElement = element('button', 'chat-settings-end chat-settings-suspend', SUSPEND_LABEL);
  private readonly prompt: SuspendPrompt = new SuspendPrompt();

  constructor(
    private readonly chat: () => ChatSnapshot | null,
    private readonly onConfirm: () => void,
  ) {
    this.root.type = 'button';
    this.root.title = 'Close the chat and keep it under Suspended; a message brings it back';
    this.root.addEventListener('click', (): void => this.ask());
  }

  // Anchored on the button, so the popover holding it must be open first.
  ask(): void {
    const chat: ChatSnapshot | null = this.chat();
    if (chat !== null) this.prompt.request(chat, this.root, this.onConfirm);
  }

  dismiss(): void {
    this.prompt.dismiss();
  }
}
