import { actionShortcuts } from '../shortcuts/shortcut-catalog';
import { shortcutKeysText } from '../shortcuts/shortcut-hint';
import type { ActionShortcut } from '../shortcuts/shortcut-types';

const KEY_TOKEN: RegExp = /\{key:([a-z-]+)\}/g;

// Ids an answer names that are not in the registry; empty when every key it quotes is real.
export function unknownKeyTokens(answer: string): readonly string[] {
  return [...answer.matchAll(KEY_TOKEN)].map((match: RegExpMatchArray) => match[1] ?? '').filter((id: string) => findShortcut(id) === undefined);
}

// The answer as shown: each {key:<id>} becomes that shortcut's keys ("Ctrl+Backspace").
export function resolveKeyTokens(answer: string): string {
  return answer.replace(KEY_TOKEN, (token: string, id: string): string => {
    const shortcut: ActionShortcut | undefined = findShortcut(id);
    return shortcut === undefined ? token : shortcutKeysText(shortcut);
  });
}

function findShortcut(id: string): ActionShortcut | undefined {
  return actionShortcuts().find((shortcut: ActionShortcut) => shortcut.id === id);
}
