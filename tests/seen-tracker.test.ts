import { beforeEach, describe, expect, it } from 'vitest';
import { SeenTracker } from '../src/renderer/seen-tracker';
import type { ChatSnapshot } from '../src/shared/types';

const chat = (status: ChatSnapshot['status'], statusSince: number): ChatSnapshot => ({
  sessionId: 's1', pid: 1, name: 'A', color: null, repository: { name: 'r', root: '/r' }, cwd: '/r', startedAt: 0, status, statusSince, agents: [], shells: [], isFocused: false,
});

describe('SeenTracker', () => {
  beforeEach(() => {
    globalThis.localStorage = { getItem: () => null, setItem: () => undefined } as unknown as Storage;
  });

  it('marks a chat that finished after the radar started, until it is looked at', () => {
    const seen: SeenTracker = new SeenTracker(1000);
    expect(seen.isUnseen(chat('idle', 500))).toBe(false);
    expect(seen.isUnseen(chat('idle', 2000))).toBe(true);
    seen.markSeen('s1', 2500);
    expect(seen.isUnseen(chat('idle', 2000))).toBe(false);
  });

  it('marks a chat seen only once the user leaves it', () => {
    const seen: SeenTracker = new SeenTracker(1000);
    seen.updateViewing(new Set(['s1']), 3000);
    expect(seen.isUnseen(chat('idle', 2000))).toBe(true);
    seen.updateViewing(new Set(['other']), 4000);
    expect(seen.isUnseen(chat('idle', 2000))).toBe(false);
  });

  it('drops the unread dot while the chat is open but keeps it unseen until it is left', () => {
    const seen: SeenTracker = new SeenTracker(1000);
    expect(seen.hasUnreadReply(chat('idle', 2000))).toBe(true);
    seen.updateViewing(new Set(['s1']), 3000);
    expect(seen.hasUnreadReply(chat('idle', 2000))).toBe(false);
    expect(seen.isUnseen(chat('idle', 2000))).toBe(true);
  });

  it('never marks a chat that is still working', () => {
    expect(new SeenTracker(0).isUnseen(chat('busy', 2000))).toBe(false);
  });
});
