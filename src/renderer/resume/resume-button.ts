import type { ActionResult, PastChat } from '../../shared/types';
import { element } from '../dom';
import { HISTORY_ICON } from '../icons';
import type { LaunchListener } from '../launch-watch';
import { resumedChatTarget } from '../launch-watch';
import { withShortcut } from '../shortcuts/shortcut-hint';
import { ResumePopover } from './resume-popover';

const IDLE_LABEL: string = 'Resume';
const IDLE_TITLE: string = withShortcut('Reopen a past chat from any project', 'resume');
// Long enough to read "Opening…" before the new kitty window takes focus.
const FEEDBACK_MS: number = 1500;

// Top-bar "Resume": like Claude Code's /resume across every project, for chats that are not open right now.
export class ResumeButton {
  private readonly button: HTMLButtonElement = element('button', 'resume-button');
  private readonly label: HTMLSpanElement = element('span', 'resume-label', IDLE_LABEL);
  // The last listing, for the title the panel shows while a picked chat starts.
  private chats: readonly PastChat[] = [];
  private readonly popover: ResumePopover = new ResumePopover({
    pick: (sessionId: string): void => void this.resume(sessionId),
    close: (): void => this.popover.close(),
  });

  constructor(
    root: HTMLElement,
    private readonly launches: LaunchListener,
  ) {
    this.button.type = 'button';
    this.button.title = IDLE_TITLE;
    // A phone shows only the icon, so the button needs a name of its own.
    this.button.setAttribute('aria-label', 'Resume a past chat');
    this.button.innerHTML = HISTORY_ICON;
    this.button.append(this.label);
    root.append(this.button, this.popover.root);
    this.button.addEventListener('click', (): void => this.toggle());
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!root.contains(event.target as Node)) this.popover.close();
    });
  }

  toggle(): void {
    if (this.popover.isOpen) return this.popover.close();
    this.popover.open();
    void this.load();
  }

  // Re-read on every open: a chat closed a minute ago belongs in the list, one reopened since does not.
  private async load(): Promise<void> {
    const chats: PastChat[] = await window.radar.listPastChats();
    this.chats = chats;
    this.popover.show(chats);
  }

  // The panel opens on a placeholder at once and becomes the chat when it shows up on the board.
  private async resume(sessionId: string): Promise<void> {
    this.popover.close();
    this.label.textContent = 'Opening…';
    this.button.disabled = true;
    const launchedAt: number = Date.now();
    this.launches.expect(resumedChatTarget(sessionId, this.titleOf(sessionId)), launchedAt);
    const result: ActionResult = await window.radar.resumeChat(sessionId);
    if (!result.ok) {
      this.launches.fail(launchedAt, result.error ?? 'Could not resume the chat.');
      this.label.textContent = 'Failed';
      this.button.title = result.error ?? 'Could not resume the chat';
      console.error(`Could not resume ${sessionId}: ${result.error ?? 'unknown error'}`);
    }
    window.setTimeout((): void => {
      this.button.disabled = false;
      this.label.textContent = IDLE_LABEL;
      this.button.title = IDLE_TITLE;
    }, FEEDBACK_MS);
  }

  private titleOf(sessionId: string): string {
    return this.chats.find((chat: PastChat) => chat.sessionId === sessionId)?.title ?? 'Resumed chat';
  }
}
