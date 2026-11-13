import { describe, expect, it } from 'vitest';
import { asksPermission } from '../src/core/chat-status';
import { dotKindOf } from '../src/renderer/unseen-dot';
import type { ChatSnapshot } from '../src/shared/types';

const chat = (status: ChatSnapshot['status'], isPermission: boolean = false): ChatSnapshot => ({
  sessionId: 's1', pid: 1, name: 'A', color: null, repository: { name: 'r', root: '/r' }, cwd: '/r', startedAt: 0, status, statusSince: 0,
  asksPermission: isPermission, agents: [], shells: [], lastReplyAt: 0, isFocused: false, approval: null, localCi: null,
});

describe('when a chat shows its dot', () => {
  it('keeps the dot on a question that was seen but not answered', () => {
    expect(dotKindOf(chat('waiting'), false)).toBe('question');
    expect(dotKindOf(chat('waiting'), true)).toBe('question');
  });

  it('marks an allow-or-deny permission prompt apart from a question', () => {
    expect(dotKindOf(chat('waiting', true), false)).toBe('permission');
  });

  it('shows an unread reply until it is opened, then drops it', () => {
    expect(dotKindOf(chat('idle'), true)).toBe('unread');
    expect(dotKindOf(chat('idle'), false)).toBeNull();
  });

  it('keeps the approval dot on an open Orbit approval request, read or not', () => {
    const asking: ChatSnapshot = { ...chat('idle'), approval: { action: 'release', summary: 'Cut v1.2.3', requestedAt: 0 } };
    expect(dotKindOf(asking, false)).toBe('approval');
    expect(dotKindOf(asking, true)).toBe('approval');
  });

  it('shows nothing for a working chat that has nothing unread', () => {
    expect(dotKindOf(chat('busy'), false)).toBeNull();
  });
});

describe('which waits are permission prompts', () => {
  it('reads the reason Claude Code writes in the session file', () => {
    expect(asksPermission('waiting', 'permission prompt')).toBe(true);
    expect(asksPermission('waiting', 'sandbox request')).toBe(true);
    expect(asksPermission('waiting', 'input needed')).toBe(false);
    expect(asksPermission('waiting', undefined)).toBe(false);
    expect(asksPermission('idle', 'permission prompt')).toBe(false);
  });
});
