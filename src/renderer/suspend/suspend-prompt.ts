import type { ChatSnapshot } from '../../shared/types';
import { ConfirmPopover } from '../sheet/confirm-popover';
import { suspendStops, suspendWarning } from './suspend-stops';

const SUSPEND_LABEL: string = 'Suspend';

// Suspends at once, or first asks above the anchor when the chat is working, running agents or background shells.
export class SuspendPrompt {
  private readonly confirm: ConfirmPopover = new ConfirmPopover();

  request(chat: ChatSnapshot, anchor: HTMLElement, onConfirm: () => void): void {
    const warning: string | null = suspendWarning(suspendStops(chat));
    if (warning === null) return onConfirm();
    this.confirm.open(anchor, { confirmLabel: SUSPEND_LABEL, note: warning, onConfirm });
  }

  dismiss(): void {
    this.confirm.dismiss();
  }
}
