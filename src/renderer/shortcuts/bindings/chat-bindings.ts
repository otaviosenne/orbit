import type { ShortcutBindings } from '../shortcut-dispatcher';
import { when } from './binding';

// The open chat's panel, as the keyboard reaches it; each action keeps the confirmation its button asks for.
export interface OpenChatControls {
  // Null while the panel is closed or shows a chat still starting.
  readonly sessionId: string | null;
  readonly isShowingClosed: boolean;
  readonly showsLiveChat: boolean;
  readonly isWorking: boolean;
  startRename(): void;
  toggleSettings(): void;
  askToClose(): void;
  askToInterrupt(): void;
  jumpToOwnMessage(direction: 'up' | 'down'): void;
  scrollThread(direction: 'up' | 'down'): void;
}

export interface ChatShortcutHost {
  readonly sheet: OpenChatControls;
  readonly togglePin: (sessionId: string) => void;
  readonly openWindow: (sessionId: string) => void;
  readonly goToTerminal: (sessionId: string) => void;
}

type ChatShortcutId =
  | 'chat-pin'
  | 'chat-rename'
  | 'chat-window'
  | 'chat-terminal'
  | 'chat-settings'
  | 'chat-previous-message'
  | 'chat-next-message'
  | 'chat-scroll-up'
  | 'chat-scroll-down'
  | 'chat-interrupt'
  | 'chat-close';

export function chatBindings(host: ChatShortcutHost): Pick<ShortcutBindings, ChatShortcutId> {
  const sheet: OpenChatControls = host.sheet;
  const isOpen = (): boolean => sheet.sessionId !== null;
  // A closed pinned chat can still be unpinned, but has no window, terminal or process to act on.
  const isLive = (): boolean => isOpen() && !sheet.isShowingClosed;
  const withSession = (action: (sessionId: string) => void): (() => void) => (): void => {
    if (sheet.sessionId !== null) action(sheet.sessionId);
  };
  return {
    'chat-pin': when(isOpen, withSession(host.togglePin)),
    'chat-rename': when((): boolean => sheet.showsLiveChat, (): void => sheet.startRename()),
    'chat-window': when(isLive, withSession(host.openWindow)),
    'chat-terminal': when(isLive, withSession(host.goToTerminal)),
    'chat-settings': when((): boolean => sheet.showsLiveChat, (): void => sheet.toggleSettings()),
    'chat-previous-message': when(isOpen, (): void => sheet.jumpToOwnMessage('up')),
    'chat-next-message': when(isOpen, (): void => sheet.jumpToOwnMessage('down')),
    'chat-scroll-up': when(isOpen, (): void => sheet.scrollThread('up')),
    'chat-scroll-down': when(isOpen, (): void => sheet.scrollThread('down')),
    'chat-interrupt': when((): boolean => sheet.showsLiveChat && sheet.isWorking, (): void => sheet.askToInterrupt()),
    'chat-close': when((): boolean => sheet.showsLiveChat, (): void => sheet.askToClose()),
  };
}
