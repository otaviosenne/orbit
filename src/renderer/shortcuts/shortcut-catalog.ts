import type { KeyChord } from './key-chord';
import type { ActionShortcut, ActionShortcutId, Shortcut } from './shortcut-types';

// Ctrl+1 … Ctrl+9: one per pinned chat, in pin order, like browser tabs.
export const PINNED_SLOTS: number = 9;
const FIRST_SLOT: number = 1;

const PINNED_KEYS: readonly KeyChord[] = Array.from({ length: PINNED_SLOTS }, (_unused: unknown, index: number): KeyChord => ({
  key: String(index + FIRST_SLOT),
  ctrl: true,
}));

// Every shortcut Orbit has. The key handler dispatches the action entries and Help lists all of them, so
// the two can never disagree.
export const SHORTCUTS: readonly Shortcut[] = [
  { kind: 'action', id: 'view-board', group: 'Views', description: 'Board', keys: [{ key: '1' }] },
  // A grid of live tiles needs a desk-sized screen, so Orbit Web has no Panel.
  { kind: 'action', id: 'view-panel', group: 'Views', description: 'Panel', keys: [{ key: '2' }], desktopOnly: true },
  { kind: 'action', id: 'view-timeline', group: 'Views', description: 'Timeline', keys: [{ key: '3' }] },
  { kind: 'action', id: 'view-list', group: 'Views', description: 'List', keys: [{ key: '4' }] },
  // The digits follow the toolbar left to right, and the gear sits after the tabs.
  { kind: 'action', id: 'view-settings', group: 'Views', description: 'Settings', keys: [{ key: ',' }, { key: '5' }] },
  {
    kind: 'reference',
    id: 'list-move',
    group: 'Views',
    description: 'List: move the focused chat up or down (Manual order)',
    keys: [{ key: 'ArrowUp', alt: true }, { key: 'ArrowDown', alt: true }],
  },

  { kind: 'action', id: 'new-chat', group: 'General', description: 'New chat in the last project', keys: [{ key: 'n' }] },
  { kind: 'action', id: 'new-chat-menu', group: 'General', description: 'Choose a project for a new chat', keys: [{ key: 'n', shift: true }] },
  { kind: 'action', id: 'resume', group: 'General', description: 'Resume a past chat', keys: [{ key: 'r' }] },
  { kind: 'action', id: 'help', group: 'General', description: 'Show this help', keys: [{ key: '?' }] },
  { kind: 'reference', id: 'dismiss', group: 'General', description: 'Close the menu, popover or panel on top', keys: [{ key: 'Escape' }] },

  { kind: 'action', id: 'board-up', group: 'Board', description: 'Focus the card above', keys: [{ key: 'ArrowUp' }, { key: 'k' }], repeats: true },
  { kind: 'action', id: 'board-down', group: 'Board', description: 'Focus the card below', keys: [{ key: 'ArrowDown' }, { key: 'j' }], repeats: true },
  { kind: 'action', id: 'board-left', group: 'Board', description: 'Focus the column to the left', keys: [{ key: 'ArrowLeft' }, { key: 'h' }], repeats: true },
  { kind: 'action', id: 'board-right', group: 'Board', description: 'Focus the column to the right', keys: [{ key: 'ArrowRight' }, { key: 'l' }], repeats: true },
  { kind: 'action', id: 'board-open', group: 'Board', description: 'Open the focused chat', keys: [{ key: 'Enter' }] },
  {
    kind: 'action',
    id: 'open-pinned',
    group: 'Board',
    description: 'Open pinned chat 1 to 9',
    keys: PINNED_KEYS,
    display: [{ key: '1–9', ctrl: true }],
  },

  { kind: 'reference', id: 'chat-back', group: 'Open chat', description: 'Back out of a rename or agent, then close the panel', keys: [{ key: 'Escape' }] },
  { kind: 'action', id: 'chat-pin', group: 'Open chat', description: 'Pin or unpin', keys: [{ key: 'p' }] },
  { kind: 'action', id: 'chat-rename', group: 'Open chat', description: 'Rename', keys: [{ key: 'F2' }, { key: 'e' }] },
  { kind: 'action', id: 'chat-window', group: 'Open chat', description: 'Open in its own window', keys: [{ key: 'w' }], desktopOnly: true },
  { kind: 'action', id: 'chat-terminal', group: 'Open chat', description: 'Go to its terminal', keys: [{ key: 't' }], desktopOnly: true },
  { kind: 'action', id: 'chat-settings', group: 'Open chat', description: 'Chat settings (model, effort, permissions, skills)', keys: [{ key: 's' }] },
  { kind: 'action', id: 'chat-previous-message', group: 'Open chat', description: 'Jump to your previous message', keys: [{ key: '[' }], repeats: true },
  { kind: 'action', id: 'chat-next-message', group: 'Open chat', description: 'Jump to your next message', keys: [{ key: ']' }], repeats: true },
  { kind: 'action', id: 'chat-scroll-up', group: 'Open chat', description: 'Scroll the thread up, even while typing', keys: [{ key: 'ArrowUp', alt: true }], repeats: true, whileTyping: true },
  { kind: 'action', id: 'chat-scroll-down', group: 'Open chat', description: 'Scroll the thread down, even while typing', keys: [{ key: 'ArrowDown', alt: true }], repeats: true, whileTyping: true },
  { kind: 'action', id: 'chat-interrupt', group: 'Open chat', description: 'Interrupt Claude while it works (asks first)', keys: [{ key: 'i' }] },
  { kind: 'action', id: 'chat-close', group: 'Open chat', description: 'Close the chat (asks first)', keys: [{ key: 'Backspace', ctrl: true }], desktopOnly: true },
  { kind: 'reference', id: 'thread-zoom', group: 'Open chat', description: 'Make the thread text bigger or smaller', keys: [{ key: 'Wheel', ctrl: true }] },

  { kind: 'reference', id: 'composer-send', group: 'Composer & voice', description: 'Send', keys: [{ key: 'Enter' }] },
  { kind: 'reference', id: 'composer-newline', group: 'Composer & voice', description: 'New line', keys: [{ key: 'Enter', shift: true }] },
  { kind: 'reference', id: 'dictate', group: 'Composer & voice', description: 'Dictate while held (tap types a space)', keys: [{ key: ' ' }], gesture: 'hold', desktopOnly: true },
  { kind: 'reference', id: 'hands-free', group: 'Composer & voice', description: 'Hands-free on or off', keys: [{ key: ' ' }], gesture: 'double-tap', desktopOnly: true },

  { kind: 'action', id: 'timeline-mode', group: 'Timeline & Panel', description: 'Timeline: switch Bars and Lines', keys: [{ key: 'm' }] },
  { kind: 'action', id: 'timeline-scope', group: 'Timeline & Panel', description: 'Timeline: switch Open and All chats', keys: [{ key: 'a' }] },
  { kind: 'action', id: 'timeline-longer', group: 'Timeline & Panel', description: 'Timeline: longer range', keys: [{ key: '-' }] },
  { kind: 'action', id: 'timeline-shorter', group: 'Timeline & Panel', description: 'Timeline: shorter range', keys: [{ key: '=' }, { key: '+' }] },
  { kind: 'reference', id: 'tile-zoom', group: 'Timeline & Panel', description: 'Panel: tile text size', keys: [{ key: 'Wheel', ctrl: true }], desktopOnly: true },
];

export function actionShortcuts(shortcuts: readonly Shortcut[] = SHORTCUTS): readonly ActionShortcut[] {
  return shortcuts.filter((shortcut: Shortcut): shortcut is ActionShortcut => shortcut.kind === 'action');
}

export function actionShortcut(id: ActionShortcutId): ActionShortcut {
  const found: ActionShortcut | undefined = actionShortcuts().find((shortcut: ActionShortcut) => shortcut.id === id);
  if (found === undefined) throw new Error(`Unknown shortcut: ${id}`);
  return found;
}

// What Help lists on this host: Orbit Web leaves out the desktop-only keys.
export function availableShortcuts(isWeb: boolean, shortcuts: readonly Shortcut[] = SHORTCUTS): readonly Shortcut[] {
  return shortcuts.filter((shortcut: Shortcut) => !isWeb || shortcut.desktopOnly !== true);
}
