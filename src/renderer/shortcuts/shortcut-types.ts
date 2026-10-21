import type { KeyChord } from './key-chord';

export type ShortcutGroup = 'Views' | 'General' | 'Board' | 'Open chat' | 'Composer & voice' | 'Timeline & Panel';

// The order Help lists the groups in.
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = ['Views', 'General', 'Board', 'Open chat', 'Composer & voice', 'Timeline & Panel'];

export type ActionShortcutId =
  | 'view-board'
  | 'view-panel'
  | 'view-timeline'
  | 'view-settings'
  | 'new-chat'
  | 'new-chat-menu'
  | 'resume'
  | 'help'
  | 'board-up'
  | 'board-down'
  | 'board-left'
  | 'board-right'
  | 'board-open'
  | 'open-pinned'
  | 'chat-pin'
  | 'chat-rename'
  | 'chat-window'
  | 'chat-terminal'
  | 'chat-settings'
  | 'chat-previous-message'
  | 'chat-next-message'
  | 'chat-interrupt'
  | 'chat-close'
  | 'timeline-mode'
  | 'timeline-scope'
  | 'timeline-longer'
  | 'timeline-shorter';

// How a reference key is used when a plain press is not the whole story.
export type KeyGesture = 'hold' | 'double-tap';

interface ShortcutBase {
  readonly description: string;
  readonly group: ShortcutGroup;
  // Alternatives: any one of them triggers the shortcut.
  readonly keys: readonly KeyChord[];
  // Printed instead of every chord, for a run like Ctrl+1 … Ctrl+9.
  readonly display?: readonly KeyChord[];
  readonly gesture?: KeyGesture;
  // Orbit Web has no windows, terminals, dictation or closing chats.
  readonly desktopOnly?: boolean;
}

// A key the shortcut dispatcher handles.
export interface ActionShortcut extends ShortcutBase {
  readonly kind: 'action';
  readonly id: ActionShortcutId;
  // Holding the key down keeps stepping (moving through cards, jumping through messages).
  readonly repeats?: boolean;
}

// A key another part of Orbit already handles (the composer, dictation, Escape); listed in Help only.
export interface ReferenceShortcut extends ShortcutBase {
  readonly kind: 'reference';
  readonly id: string;
}

export type Shortcut = ActionShortcut | ReferenceShortcut;
