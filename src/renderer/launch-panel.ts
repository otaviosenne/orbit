import type { ChatColor } from '../shared/chat-colors';
import type { ChatSnapshot } from '../shared/types';
import type { AdoptedChat, LaunchListener, LaunchTarget, LaunchWatch } from './launch-watch';
import { targetName } from './launch-watch';
import type { ColorPreview } from './new-chat/new-chat-color';
import { applyNewChatColor, pickNewChatColor } from './new-chat/new-chat-color';
import type { PendingChat } from './pending-chat';

const TIMED_OUT_MESSAGE: string = 'The chat did not start within a minute. Its terminal on workspace 99 may say why.';

// The side panel's side of a launch: a placeholder while the chat starts, an error if it does not.
export interface PendingSheet {
  openPending(chat: PendingChat): void;
  recolorPending(launchedAt: number, color: string | null): void;
  failPending(launchedAt: number, message: string): void;
}

export interface LaunchPanelHost {
  readonly sheet: PendingSheet;
  readonly colorPreview: ColorPreview;
  // False where the side panel has no place, such as the Panel view.
  canShowPanel(): boolean;
  openChats(): readonly ChatSnapshot[];
  openChat(sessionId: string): void;
  markSeen(chat: ChatSnapshot, now: number): void;
  render(): void;
}

// Opens the panel the moment New chat or Resume is pressed, then hands it to the live chat once the poll finds it.
export class LaunchPanel implements LaunchListener {
  // A new chat's color is chosen at the click, so the placeholder already wears it, and applied once the chat is up.
  private readonly newChatColors: Map<number, ChatColor> = new Map();

  constructor(
    private readonly watch: LaunchWatch,
    private readonly host: LaunchPanelHost,
  ) {}

  // The watcher is told first, so it remembers the panel the user had before the placeholder replaced it.
  expect(target: LaunchTarget, launchedAt: number): void {
    this.watch.expect(target, launchedAt);
    const color: ChatColor | null = target.kind === 'new' ? this.pickColor(launchedAt) : null;
    if (!this.host.canShowPanel()) return;
    this.host.sheet.openPending({ launchedAt, name: targetName(target), color });
    if (target.kind === 'resumed') void this.loadColor(target.sessionId, launchedAt);
  }

  fail(launchedAt: number, error: string): void {
    this.watch.cancel(launchedAt);
    this.newChatColors.delete(launchedAt);
    this.host.sheet.failPending(launchedAt, error);
  }

  // Runs after every poll.
  settle(now: number): void {
    for (const launchedAt of this.watch.expire(now)) {
      this.newChatColors.delete(launchedAt);
      this.host.sheet.failPending(launchedAt, TIMED_OUT_MESSAGE);
    }
    for (const adopted of this.watch.take(this.host.openChats())) this.adopt(adopted, now);
  }

  // Seen, so it lands in Active instead of Needs you; its panel opens unless the user opened another chat meanwhile.
  private adopt({ chat, launchedAt, mayOpenPanel }: AdoptedChat, now: number): void {
    this.host.markSeen(chat, now);
    const color: ChatColor | undefined = this.newChatColors.get(launchedAt);
    this.newChatColors.delete(launchedAt);
    if (color !== undefined) void applyNewChatColor(chat, color, this.host.colorPreview);
    if (!mayOpenPanel) return this.host.render();
    this.watch.markOpened(chat.sessionId);
    this.host.openChat(chat.sessionId);
  }

  private pickColor(launchedAt: number): ChatColor {
    const color: ChatColor = pickNewChatColor(this.host.openChats());
    this.newChatColors.set(launchedAt, color);
    return color;
  }

  private async loadColor(sessionId: string, launchedAt: number): Promise<void> {
    this.host.sheet.recolorPending(launchedAt, await window.radar.getChatColor(sessionId));
  }
}
