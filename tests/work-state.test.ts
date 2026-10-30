import { describe, expect, it } from 'vitest';
import { LONG_SHELL_MS, workStateOf } from '../src/renderer/work-state';
import type { ChatSnapshot, ShellSnapshot } from '../src/shared/types';

const NOW: number = 10 * LONG_SHELL_MS;

function shell(startedAgo: number, status: ShellSnapshot['status'] = 'running'): ShellSnapshot {
  return { id: `s${startedAgo}`, command: 'npm run dev', description: null, startedAt: NOW - startedAgo, status, endedAt: null, exitCode: null };
}

function shellChat(shells: readonly ShellSnapshot[]): ChatSnapshot {
  return {
    sessionId: 'c', pid: 1, name: 'c', color: null, repository: { name: 'r', root: '/r' }, cwd: '/r', startedAt: 0,
    status: 'shell', statusSince: 0, agents: [], shells, lastReplyAt: null, isFocused: false, approval: null, localCi: null,
  };
}

describe('a chat kept busy only by background commands', () => {
  it('stays in Working while a command is younger than 30 minutes', () => {
    expect(workStateOf(shellChat([shell(LONG_SHELL_MS - 1)]), NOW)).toBe('shell-only');
    expect(workStateOf(shellChat([shell(LONG_SHELL_MS + 1), shell(1)]), NOW)).toBe('shell-only');
  });

  it('rests once every running command is older than 30 minutes', () => {
    expect(workStateOf(shellChat([shell(LONG_SHELL_MS + 1)]), NOW)).toBe('resting');
    expect(workStateOf(shellChat([shell(LONG_SHELL_MS + 1), shell(1, 'completed')]), NOW)).toBe('resting');
  });

  it('keeps the status when no running command is listed', () => {
    expect(workStateOf(shellChat([]), NOW)).toBe('shell-only');
  });
});
