import type { ChatSnapshot } from '../../shared/types';
import { SuspendPrompt } from './suspend-prompt';
import { SuspendedChats } from './suspended-chats';
import { loadSuspendedCollapsed, saveSuspendedCollapsed } from './suspended-collapse';

export interface SuspensionHost {
  // Closes the chat the way Close does (optimistic); resolves false when the close failed.
  readonly close: (sessionId: string) => Promise<boolean>;
  // Re-derives the shown chats and redraws, since membership decides which runs count as open.
  readonly changed: () => void;
  // Whether this window tells the others when a chat leaves Suspended on its own: only the desktop, which polls
  // all the time.
  readonly sharesSettled: boolean;
}

// Suspending a chat: closing it while keeping it in the board's Suspended section until it is open again.
export class ChatSuspension {
  private readonly store: SuspendedChats;
  private readonly prompt: SuspendPrompt = new SuspendPrompt();
  private collapsed: boolean = loadSuspendedCollapsed();

  constructor(private readonly host: SuspensionHost) {
    this.store = new SuspendedChats(host.sharesSettled);
  }

  get isCollapsed(): boolean {
    return this.collapsed;
  }

  // Asks first above the anchor when the chat is working, running agents or background shells.
  request(chat: ChatSnapshot, anchor: HTMLElement): void {
    this.prompt.request(chat, anchor, (): void => void this.suspend(chat));
  }

  // Recorded before closing, so the card goes straight to Suspended instead of flashing back as open while its
  // process ends; taken back if the close fails.
  async suspend(chat: ChatSnapshot): Promise<void> {
    this.store.add(chat, Date.now());
    if (await this.host.close(chat.sessionId)) return;
    this.store.remove(chat.sessionId);
    this.host.changed();
  }

  // Takes the card out of Suspended without reopening the chat, which stays in Resume.
  remove(sessionId: string): void {
    this.store.remove(sessionId);
    this.host.changed();
  }

  // Another Orbit window changed Suspended.
  reload(): void {
    this.store.reload();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    saveSuspendedCollapsed(this.collapsed);
    this.host.changed();
  }

  has(sessionId: string): boolean {
    return this.store.has(sessionId);
  }

  // With every poll: chats open again, by whatever path, leave Suspended, and so do chats whose close never took.
  settle(polled: readonly ChatSnapshot[], now: number): void {
    this.store.settle(polled, now);
  }

  // Pinned chats as their keys reach them: one shown only in Suspended has no place in the Pinned row.
  pinnedInRow(order: readonly string[]): string[] {
    return this.store.withoutSuspended(order);
  }

  visible(chats: readonly ChatSnapshot[]): ChatSnapshot[] {
    return this.store.visible(chats);
  }

  snapshots(): ChatSnapshot[] {
    return this.store.snapshots();
  }

  closedSnapshot(sessionId: string): ChatSnapshot | null {
    return this.store.closedSnapshot(sessionId);
  }
}
