import { describe, expect, it } from 'vitest';
import type { Shortcut } from '../src/main/shortcut-file';
import { formatShortcutLine, parseShortcuts, shortcutId } from '../src/main/shortcut-file';

const SHORTCUT: Shortcut = { id: 'claude-acme', label: 'Claude acme', chatName: 'Acme 🧸', folder: '/home/me/code/client-portal' };

describe('shortcuts.tsv', () => {
  it('round-trips a shortcut through one line', () => {
    expect(parseShortcuts(formatShortcutLine(SHORTCUT))).toEqual([SHORTCUT]);
  });

  it('skips comments, blank lines and lines missing fields', () => {
    const text: string = `# id\tlabel\tchat\tfolder\n\n${formatShortcutLine(SHORTCUT)}broken\tline\n`;
    expect(parseShortcuts(text)).toEqual([SHORTCUT]);
  });
});

describe('shortcutId', () => {
  it('keeps only shell-safe characters', () => {
    expect(shortcutId("Claude's  acme (API)", [])).toBe('claude-s-acme-api');
  });

  it('numbers a duplicate', () => {
    expect(shortcutId('Acme', ['acme', 'acme-2'])).toBe('acme-3');
  });

  it('falls back when nothing safe is left', () => {
    expect(shortcutId('🧸', [])).toBe('shortcut');
  });
});
