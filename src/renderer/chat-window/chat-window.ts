import type { ChatSnapshot } from '../../shared/types';
import { requireElement } from '../dom';
import type { ChatPatch } from '../pending-edits';
import { PendingEdits } from '../pending-edits';
import { ChatSheet } from '../sheet/chat-sheet';
import { loadThread } from '../sheet/thread-loader';
import { applyTheme, loadTheme } from '../theme';
import { EndedNotice } from './ended-notice';

const CHATS_POLL_MS: number = 2000;
const BACK_KEY: string = 'Escape';
// Styles hide the hub's board and let the panel fill the window.
const CHAT_WINDOW_CLASS: string = 'chat-window';
const TITLE_SUFFIX: string = ' — Orbit';
const CLOSE_TOOLTIP: string = 'Close window';

export function startChatWindow(sessionId: string): void {
  document.body.classList.add(CHAT_WINDOW_CLASS);
  followTheme();
  new ChatWindow(sessionId).start();
}

// The hub owns the theme setting; another window changing it shows up here as a storage event.
function followTheme(): void {
  applyTheme(loadTheme());
  window.addEventListener('storage', (): void => applyTheme(loadTheme()));
}

// One chat in its own window: the hub's chat panel, filling the window, for as long as the chat runs.
class ChatWindow {
  private readonly pendingEdits: PendingEdits = new PendingEdits();
  private readonly ended: EndedNotice = new EndedNotice((): void => window.close());
  private readonly sheet: ChatSheet;
  private polled: ChatSnapshot | null = null;

  constructor(private readonly sessionId: string) {
    this.sheet = new ChatSheet((): void => window.close(), {
      show: (id: string, patch: ChatPatch): void => {
        this.pendingEdits.set(id, patch, Date.now());
        this.show();
      },
      undo: (id: string, field: keyof ChatPatch): void => {
        this.pendingEdits.drop(id, field);
        this.show();
      },
    }, (): void => void this.refresh());
    requireElement('#sheet-close').title = CLOSE_TOOLTIP;
    listenForBackKey(this.sheet);
  }

  start(): void {
    void this.refresh();
    setInterval((): void => void this.refresh(), CHATS_POLL_MS);
  }

  private async refresh(): Promise<void> {
    const chats: ChatSnapshot[] = await window.radar.getChats();
    this.polled = chats.find((chat: ChatSnapshot) => chat.sessionId === this.sessionId) ?? null;
    const chat: ChatSnapshot | null = this.show();
    if (chat !== null) await loadThread(this.sheet, chat);
  }

  // Shows the last poll plus pending edits; null when the chat is gone. A chat that comes back is shown again.
  private show(): ChatSnapshot | null {
    if (this.polled === null) {
      // Closing the panel also stops typing, Enter and Space from reaching a chat that no longer exists.
      if (this.sheet.sessionId !== null) this.sheet.close();
      this.ended.show();
      return null;
    }
    const [chat]: ChatSnapshot[] = this.pendingEdits.apply([this.polled], Date.now());
    this.ended.hide();
    if (this.sheet.sessionId === null) this.sheet.open(chat);
    else this.sheet.update(chat);
    document.title = `${chat.name}${TITLE_SUFFIX}`;
    return chat;
  }
}

// Escape backs out of a rename or an open agent but never closes the window, unlike the hub's panel.
function listenForBackKey(sheet: ChatSheet): void {
  document.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key === BACK_KEY) sheet.dismissSubAction();
  });
}
