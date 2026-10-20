import { describe, expect, it } from 'vitest';
import { toLauncherEntries } from '../src/main/launcher-entries';
import type { Shortcut } from '../src/main/shortcut-file';

const SHORTCUT: Shortcut = { id: 'acme-today', label: 'Acme today', chatName: 'Acme sprint', folder: '/home/me/code/acme' };
const OUTPUT: string = 'claude\tmy-claude\nacme\tacme repo\nAcme today\t/x/start-shortcut.sh acme-today\n\n';

describe('toLauncherEntries', () => {
  it('names a ~/.bashrc launcher chat after its label and leaves its folder unknown', () => {
    expect(toLauncherEntries(OUTPUT, [SHORTCUT])[1]).toEqual({ name: 'acme', command: 'acme repo', chatName: 'acme', folder: null });
  });

  it('gives a shortcut its own chat name and folder', () => {
    expect(toLauncherEntries(OUTPUT, [SHORTCUT])[2]).toEqual({
      name: 'Acme today',
      command: '/x/start-shortcut.sh acme-today',
      chatName: 'Acme sprint',
      folder: '/home/me/code/acme',
    });
  });

  it('drops blank and malformed lines', () => {
    expect(toLauncherEntries('lonely\n\n', [])).toEqual([]);
  });
});
