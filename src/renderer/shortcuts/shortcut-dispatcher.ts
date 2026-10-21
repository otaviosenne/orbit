import { isTextField } from '../sheet/space-to-talk';
import { actionShortcuts, availableShortcuts } from './shortcut-catalog';
import type { ShortcutMatch } from './shortcut-match';
import { matchShortcut } from './shortcut-match';
import type { ActionShortcut, ActionShortcutId } from './shortcut-types';

// What an action does, and when it may: a shortcut that does not apply right now is left alone, so the key
// keeps its usual meaning.
export interface ShortcutBinding {
  readonly enabled: (chordIndex: number) => boolean;
  readonly run: (chordIndex: number) => void;
}

// Every action in the registry needs one, so a shortcut can never be listed in Help without working.
export type ShortcutBindings = Readonly<Record<ActionShortcutId, ShortcutBinding>>;

// Pressed while an IME composes or a dead key waits for its letter: the key is part of typing a character.
const DEAD_KEY: string = 'Dead';
const ACTIVATE_KEY: string = 'Enter';

// Listens once for the whole window. isBlocked: a menu, popover or dialog is on top and owns the keyboard.
export function installShortcutDispatcher(bindings: ShortcutBindings, isBlocked: () => boolean, isWeb: boolean): void {
  const shortcuts: readonly ActionShortcut[] = actionShortcuts(availableShortcuts(isWeb));
  document.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (!isShortcutCandidate(event) || isBlocked()) return;
    const match: ShortcutMatch | null = matchShortcut(shortcuts, event);
    if (match === null || (isTextField(event.target) && match.shortcut.whileTyping !== true)) return;
    const binding: ShortcutBinding = bindings[match.shortcut.id];
    if (!binding.enabled(match.chordIndex)) return;
    event.preventDefault();
    binding.run(match.chordIndex);
  });
}

function isShortcutCandidate(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing || event.key === DEAD_KEY) return false;
  // Enter on a focused button or link presses it; it must not also open a card.
  return !(event.key === ACTIVATE_KEY && isActivatable(event.target));
}

function isActivatable(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement || target instanceof HTMLSelectElement;
}
