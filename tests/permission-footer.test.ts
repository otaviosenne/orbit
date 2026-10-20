import { describe, expect, it } from 'vitest';
import { footerPermissionMode } from '../src/main/permissions/permission-footer';

const PROMPT: string = ['❯ say ok', '● Ok.', '─────────────── ORBIT-PERMS-TEST ─', '❯ ', '───────────────'].join('\n');

function screenWith(...footer: string[]): string {
  return [PROMPT, ...footer, '', ''].join('\n');
}

describe('footerPermissionMode', () => {
  it('reads every mode the Shift+Tab cycle shows', () => {
    expect(footerPermissionMode(screenWith('  ⏵⏵ bypass permissions on (shift+tab to cycle)'))).toBe('bypassPermissions');
    expect(footerPermissionMode(screenWith('  ⏵⏵ accept edits on (shift+tab to cycle)'))).toBe('acceptEdits');
    expect(footerPermissionMode(screenWith('  ⏸ plan mode on (shift+tab to cycle)'))).toBe('plan');
    expect(footerPermissionMode(screenWith('  ⏵⏵ auto mode on (shift+tab to cycle)'))).toBe('auto');
    expect(footerPermissionMode(screenWith('  ⏸ manual mode on · ? for shortcuts'))).toBe('default');
  });

  it('copes with a footer wrapped in a narrow window and lines under it', () => {
    expect(footerPermissionMode(screenWith('  ⏵⏵ bypass permissions on (shift+tab to', '                       0 tokens', '          ● high · /effort'))).toBe(
      'bypassPermissions',
    );
  });

  it('treats a bare shortcuts hint as the default mode', () => {
    expect(footerPermissionMode(screenWith('  ? for shortcuts'))).toBe('default');
  });

  it('ignores a footer quoted higher up in the conversation', () => {
    const quoted: string = ['  ⏸ plan mode on (shift+tab to cycle)', ...Array.from({ length: 12 }, (_: unknown, index: number) => `line ${index}`)].join('\n');
    expect(footerPermissionMode(quoted)).toBeNull();
  });
});
