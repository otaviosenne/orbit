import { describe, expect, it } from 'vitest';
import type { KeyChord } from '../src/renderer/shortcuts/key-chord';
import { chordId } from '../src/renderer/shortcuts/key-chord';
import { PINNED_SLOTS, SHORTCUTS, actionShortcuts, availableShortcuts } from '../src/renderer/shortcuts/shortcut-catalog';
import { withShortcut } from '../src/renderer/shortcuts/shortcut-hint';
import type { PressedKey, ShortcutMatch } from '../src/renderer/shortcuts/shortcut-match';
import { matchShortcut } from '../src/renderer/shortcuts/shortcut-match';
import type { ActionShortcut, Shortcut } from '../src/renderer/shortcuts/shortcut-types';
import { SHORTCUT_GROUPS } from '../src/renderer/shortcuts/shortcut-types';

// Keys other parts of Orbit own: dictation, Escape's back-out chain, and the mouse wheel.
const RESERVED_KEYS: readonly string[] = [' ', 'Escape', 'Wheel'];

function press(key: string, modifiers: Partial<PressedKey> = {}): PressedKey {
  return { key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, repeat: false, ...modifiers };
}

function matchedId(pressed: PressedKey): string | null {
  return matchShortcut(actionShortcuts(), pressed)?.shortcut.id ?? null;
}

describe('shortcut registry', () => {
  it('never binds the same key press to two actions', () => {
    const ids: string[] = actionShortcuts().flatMap((shortcut: ActionShortcut) => shortcut.keys.map(chordId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every entry a unique id, a known group, a description and keys', () => {
    expect(new Set(SHORTCUTS.map((shortcut: Shortcut) => shortcut.id)).size).toBe(SHORTCUTS.length);
    for (const shortcut of SHORTCUTS) {
      expect(SHORTCUT_GROUPS).toContain(shortcut.group);
      expect(shortcut.description.trim().length).toBeGreaterThan(0);
      expect(shortcut.keys.length).toBeGreaterThan(0);
    }
  });

  it('leaves Space, Escape and the wheel to the parts of Orbit that already handle them', () => {
    const actionKeys: string[] = actionShortcuts().flatMap((shortcut: ActionShortcut) => shortcut.keys.map((chord: KeyChord) => chord.key));
    expect(actionKeys.filter((key: string) => RESERVED_KEYS.includes(key))).toEqual([]);
  });

  it('has one Ctrl+digit per pinned slot', () => {
    expect(actionShortcuts().find((shortcut: ActionShortcut) => shortcut.id === 'open-pinned')?.keys).toHaveLength(PINNED_SLOTS);
  });

  it('leaves desktop-only keys out of Orbit Web', () => {
    const webIds: string[] = availableShortcuts(true).map((shortcut: Shortcut) => shortcut.id);
    expect(webIds).not.toContain('chat-close');
    expect(webIds).not.toContain('dictate');
    expect(webIds).toContain('chat-pin');
    expect(availableShortcuts(false)).toHaveLength(SHORTCUTS.length);
  });
});

describe('matching a key press', () => {
  it('matches a letter with or without Caps Lock, but not with Shift held', () => {
    expect(matchedId(press('p'))).toBe('chat-pin');
    expect(matchedId(press('P'))).toBe('chat-pin');
    expect(matchedId(press('P', { shiftKey: true }))).toBeNull();
  });

  it('tells N from Shift+N', () => {
    expect(matchedId(press('n'))).toBe('new-chat');
    expect(matchedId(press('N', { shiftKey: true }))).toBe('new-chat-menu');
  });

  it('needs Ctrl, Alt and Meta exactly as written', () => {
    expect(matchedId(press('p', { ctrlKey: true }))).toBeNull();
    expect(matchedId(press('p', { altKey: true }))).toBeNull();
    expect(matchedId(press('p', { metaKey: true }))).toBeNull();
    expect(matchedId(press('Backspace'))).toBeNull();
    expect(matchedId(press('Backspace', { ctrlKey: true }))).toBe('chat-close');
  });

  it('ignores the Shift a symbol needs on the keyboard', () => {
    expect(matchedId(press('?', { shiftKey: true }))).toBe('help');
    expect(matchedId(press('+', { shiftKey: true }))).toBe('timeline-shorter');
    expect(matchedId(press(','))).toBe('view-settings');
  });

  it('tells a digit from Ctrl+digit and reports which pinned slot was pressed', () => {
    expect(matchedId(press('3'))).toBe('view-timeline');
    const match: ShortcutMatch | null = matchShortcut(actionShortcuts(), press('3', { ctrlKey: true }));
    expect(match?.shortcut.id).toBe('open-pinned');
    expect(match?.chordIndex).toBe(2);
  });

  it('lets only stepping keys repeat while held', () => {
    expect(matchedId(press('ArrowDown', { repeat: true }))).toBe('board-down');
    expect(matchedId(press('j', { repeat: true }))).toBe('board-down');
    expect(matchedId(press('n', { repeat: true }))).toBeNull();
  });
});

describe('tooltip hints', () => {
  it('name every key of a shortcut', () => {
    expect(withShortcut('Rename', 'chat-rename')).toBe('Rename (F2 or E)');
    expect(withShortcut('Settings', 'view-settings')).toBe('Settings (, or 4)');
    expect(withShortcut('Close', 'chat-close')).toBe('Close (Ctrl+Backspace)');
    expect(withShortcut('Pinned', 'open-pinned')).toBe('Pinned (Ctrl+1–9)');
  });
});
