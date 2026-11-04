import { describe, expect, it } from 'vitest';
import { parsePermission } from '../src/main/questions/screen/permission-parser';
import type { PickerPermissionView } from '../src/shared/types';

// Captured from Claude Code 2.1.317 with `kitty @ get-text --extent all`, the scrollback above trimmed.
const FULL_PROMPT: string = [
  '● Bash(source ./h.sh; rm -rf $V/*.mp4)',
  '  ⎿  Waiting…',
  '',
  '──────────────────────────────────────────────────────────────',
  ' Bash command · from the general-purpose agent',
  ' Source h.sh and remove mp4 files',
  '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
  ' source ./h.sh; rm -rf $V/*.mp4',
  '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
  ' │ Dangerous rm operation on possibly-empty variable path:',
  ' │ $V/*.mp4 in `rm -rf $V/*.mp4` (rewrite it as',
  ' │ "${V:?}"/*.mp4 or use a literal path)',
  ' ⚠ Claude Code will automatically block this request in 1:36,',
  ' to avoid holding up an unattended session',
  '',
  '',
  ' Do you want to proceed?',
  ' ❯ 1. Yes',
  '   2. No',
  '',
  ' Esc to cancel · Tab to amend',
].join('\n');

// A narrow window (Claude Code 2.1.317): the title wraps, the command sits behind a gutter, and the chat's own
// numbered list is still in the scrollback above the prompt.
const NARROW_PROMPT: string = [
  '  Two things are left:',
  '',
  '  1. Popup ao fechar: o escurecido some num',
  '  2. Aviso de elegibilidade',
  '',
  '────────────────────────────────────────────',
  ' Bash command · from the general-purpose',
  '              agent',
  ' Save room load evidence and inspect room UI',
  '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
  ' │ S=/tmp/crop; rm -f $S/*; for',
  ' │ i in 076 077; do magick f_$i.png; done',
  '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
  ' │ Dangerous rm operation on possibly-empty variable path:',
  ' │ $S/* in `rm -f $S/*` (rewrite it as "${S:?}"/* or use a',
  ' │ literal path)',
  '',
  ' Do you want to proceed?',
  ' ❯ 1. Yes',
  '   2. No',
  '',
  ' Esc to cancel · Tab to amend · ctrl+x ctrl+k twice to stop …',
].join('\n');

describe('permission prompt', () => {
  it('reads the tool, the command, the warnings and the answers', () => {
    const view: PickerPermissionView | null = parsePermission(FULL_PROMPT);
    expect(view).toMatchObject({
      kind: 'permission',
      title: 'Bash command · from the general-purpose agent',
      description: 'Source h.sh and remove mp4 files',
      detail: 'source ./h.sh; rm -rf $V/*.mp4',
      warnings: [
        'Dangerous rm operation on possibly-empty variable path: $V/*.mp4 in `rm -rf $V/*.mp4` (rewrite it as "${V:?}"/*.mp4 or use a literal path)',
        'Claude Code will automatically block this request, to avoid holding up an unattended session',
      ],
      question: 'Do you want to proceed?',
      options: [{ number: 1, label: 'Yes' }, { number: 2, label: 'No' }],
    });
  });

  it('reads a prompt in a narrow window under a numbered list of the chat', () => {
    expect(parsePermission(NARROW_PROMPT)).toMatchObject({
      title: 'Bash command · from the general-purpose agent',
      description: 'Save room load evidence and inspect room UI',
      detail: 'S=/tmp/crop; rm -f $S/*; for\ni in 076 077; do magick f_$i.png; done',
      warnings: ['Dangerous rm operation on possibly-empty variable path: $S/* in `rm -f $S/*` (rewrite it as "${S:?}"/* or use a literal path)'],
      question: 'Do you want to proceed?',
      options: [{ number: 1, label: 'Yes' }, { number: 2, label: 'No' }],
    });
  });

  it('keeps the same fingerprint when a wider window unwraps the prompt', () => {
    const wide: string = NARROW_PROMPT.replace(' Bash command · from the general-purpose\n              agent', ' Bash command · from the general-purpose agent')
      .replace(' │ S=/tmp/crop; rm -f $S/*; for\n │ i in 076 077; do magick f_$i.png; done', ' │ S=/tmp/crop; rm -f $S/*; for i in 076 077; do magick f_$i.png; done');
    expect(wide).not.toBe(NARROW_PROMPT);
    expect(parsePermission(wide)?.fingerprint).toBe(parsePermission(NARROW_PROMPT)?.fingerprint);
  });

  it('keeps the same fingerprint while the countdown runs', () => {
    const later: string = FULL_PROMPT.replace('in 1:36', 'in 0:52');
    expect(parsePermission(later)?.fingerprint).toBe(parsePermission(FULL_PROMPT)?.fingerprint);
  });

  it('joins an answer that wraps', () => {
    const wrapped: string = FULL_PROMPT.replace('   2. No', '   2. Yes, and don\'t ask again for rm commands in\n      /home/me/app\n   3. No');
    expect(parsePermission(wrapped)?.options).toEqual([
      { number: 1, label: 'Yes' },
      { number: 2, label: 'Yes, and don\'t ask again for rm commands in /home/me/app' },
      { number: 3, label: 'No' },
    ]);
  });

  it('leaves the question picker and an idle chat alone', () => {
    const picker: string = ' Which one?\n ❯ 1. Red\n   2. Green\n   3. Chat about this\n\n Enter to select · ↑/↓ to navigate · Esc to cancel';
    expect(parsePermission(picker)).toBeNull();
    expect(parsePermission('❯ \n──────\n  ⏵⏵ bypass permissions on')).toBeNull();
  });
});
