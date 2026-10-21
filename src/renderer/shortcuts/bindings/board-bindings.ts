import type { FocusDirection } from '../../board/spatial-nav';
import { actionShortcut } from '../shortcut-catalog';
import type { ShortcutBinding, ShortcutBindings } from '../shortcut-dispatcher';
import type { ActionShortcutId } from '../shortcut-types';
import { when } from './binding';

const ARROW_PREFIX: string = 'Arrow';

export interface BoardShortcutHost {
  readonly isBoardShown: () => boolean;
  // While a chat's panel is open, the arrow keys keep scrolling its thread; H, J, K and L still move the ring.
  readonly isPanelOpen: () => boolean;
  // The Panel view has no side panel, so no chat can be opened there.
  readonly canOpenChats: () => boolean;
  readonly boardFocus: { readonly sessionId: string | null; move(direction: FocusDirection): void };
  readonly openChat: (sessionId: string) => void;
  readonly pinnedOrder: () => readonly string[];
}

type BoardShortcutId = 'board-up' | 'board-down' | 'board-left' | 'board-right' | 'board-open' | 'open-pinned';

export function boardBindings(host: BoardShortcutHost): Pick<ShortcutBindings, BoardShortcutId> {
  const move = (id: ActionShortcutId, direction: FocusDirection): ShortcutBinding => ({
    enabled: (chordIndex: number): boolean => host.isBoardShown() && !(isArrow(id, chordIndex) && host.isPanelOpen()),
    run: (): void => host.boardFocus.move(direction),
  });
  return {
    'board-up': move('board-up', 'up'),
    'board-down': move('board-down', 'down'),
    'board-left': move('board-left', 'left'),
    'board-right': move('board-right', 'right'),
    'board-open': when(
      (): boolean => host.isBoardShown() && host.boardFocus.sessionId !== null,
      (): void => host.openChat(host.boardFocus.sessionId ?? ''),
    ),
    'open-pinned': {
      enabled: (slot: number): boolean => host.canOpenChats() && slot < host.pinnedOrder().length,
      run: (slot: number): void => host.openChat(host.pinnedOrder()[slot] ?? ''),
    },
  };
}

function isArrow(id: ActionShortcutId, chordIndex: number): boolean {
  return actionShortcut(id).keys[chordIndex]?.key.startsWith(ARROW_PREFIX) === true;
}
