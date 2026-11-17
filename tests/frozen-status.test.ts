import { describe, expect, it } from 'vitest';
import { correctedStatus, needsTitleCheck, STALE_BUSY_MS } from '../src/core/frozen-status';

const NOW: number = 1_794_917_388_706;
const LONG_AGO: number = NOW - 12 * 60 * 60_000;
const JUST_NOW: number = NOW - 10_000;

// Real kitty titles read off Hyprland: a waiting chat, and two frames of a working one's spinner.
const IDLE_TITLE: string = '✳ Locatio';
const WORKING_TITLES: readonly string[] = ['◐ ORBIT 🌍', '◑ Backoffice new feature pop-u'];

describe('correctedStatus', () => {
  it('turns a busy frozen for hours into idle when the terminal shows the idle mark', () => {
    expect(correctedStatus('busy', LONG_AGO, NOW, IDLE_TITLE)).toBe('idle');
  });

  it('keeps busy while the title spins', () => {
    for (const title of WORKING_TITLES) expect(correctedStatus('busy', LONG_AGO, NOW, title)).toBe('busy');
  });

  it('trusts a fresh busy, which the title may not have caught up with yet', () => {
    expect(correctedStatus('busy', JUST_NOW, NOW, IDLE_TITLE)).toBe('busy');
  });

  it('keeps busy when the window or its title is unknown', () => {
    expect(correctedStatus('busy', LONG_AGO, NOW, null)).toBe('busy');
    expect(correctedStatus('busy', LONG_AGO, NOW, 'bash')).toBe('busy');
  });

  it('never touches any other status', () => {
    expect(correctedStatus('waiting', LONG_AGO, NOW, IDLE_TITLE)).toBe('waiting');
    expect(correctedStatus('shell', LONG_AGO, NOW, IDLE_TITLE)).toBe('shell');
  });
});

describe('needsTitleCheck', () => {
  it('starts once busy has stood for the stale window', () => {
    expect(needsTitleCheck('busy', NOW - STALE_BUSY_MS, NOW)).toBe(true);
    expect(needsTitleCheck('busy', NOW - STALE_BUSY_MS + 1, NOW)).toBe(false);
    expect(needsTitleCheck('idle', LONG_AGO, NOW)).toBe(false);
  });
});
