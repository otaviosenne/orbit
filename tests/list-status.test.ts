import { describe, expect, it } from 'vitest';
import { ACTIVE_WINDOW_MS } from '../src/renderer/views/board-columns';
import type { ListStatus } from '../src/renderer/views/list/list-status';
import { listStatuses } from '../src/renderer/views/list/list-status';
import type { ChatSnapshot, ChatStatus } from '../src/shared/types';

const NOW: number = 100 * ACTIVE_WINDOW_MS;

function chat(name: string, status: ChatStatus, finishedAgo: number = 0): ChatSnapshot {
  return {
    sessionId: name, pid: 1, name, color: null, repository: { name: 'repo', root: '/repo' }, cwd: '/repo', startedAt: 0,
    status, statusSince: NOW - finishedAgo, agents: [], shells: [], lastReplyAt: null, isFocused: false, approval: null, localCi: null,
  };
}

describe('list statuses', () => {
  it('names the Board column each chat sits in', () => {
    const unseen = (item: ChatSnapshot): boolean => item.name === 'fresh';
    const chats: ChatSnapshot[] = [chat('fresh', 'idle'), chat('running', 'busy'), chat('recent', 'idle', 1), chat('old', 'idle', ACTIVE_WINDOW_MS + 1)];
    const statuses: Map<string, ListStatus> = listStatuses(chats, unseen, NOW, (): null => null, (): null => null);
    expect([...statuses.entries()].map(([name, status]: [string, ListStatus]) => `${name}:${status.label}`).sort()).toEqual([
      'fresh:Needs you', 'old:Idle', 'recent:Active', 'running:Working',
    ]);
  });
});
