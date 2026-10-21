import { describe, expect, it } from 'vitest';
import type { AdoptedChat, LaunchTarget } from '../src/renderer/launch-watch';
import { LAUNCH_MATCH_TIMEOUT_MS, LaunchWatch, newChatTarget, resumedChatTarget } from '../src/renderer/launch-watch';
import type { ChatSnapshot, LauncherEntry } from '../src/shared/types';

const CLICK: number = 1_000_000;
const ENTRY: LaunchTarget = newChatTarget({ name: 'acme', command: 'acme repo', chatName: 'acme', folder: null });
const SHORTCUT_ENTRY: LauncherEntry = { name: 'Client', command: 'x', chatName: 'Client chat', folder: '/home/me/code/client-portal' };
const SHORTCUT: LaunchTarget = newChatTarget(SHORTCUT_ENTRY);

function chat(sessionId: string, name: string, startedAt: number, cwd: string = '/home/me/code/acme'): ChatSnapshot {
  return {
    sessionId, pid: 1, name, color: null, repository: { name: 'r', root: cwd }, cwd, startedAt,
    status: 'idle', statusSince: startedAt, agents: [], shells: [], lastReplyAt: null, isFocused: false,
  };
}

function watchWithPanel(panel: { current: string | null }): LaunchWatch {
  return new LaunchWatch((): string | null => panel.current);
}

function ids(adopted: AdoptedChat[]): string[] {
  return adopted.map((entry: AdoptedChat) => entry.chat.sessionId);
}

describe('LaunchWatch', () => {
  it('matches by name a chat that started after the click, ignoring older chats with the same name', () => {
    const watch: LaunchWatch = watchWithPanel({ current: null });
    watch.expect(ENTRY, CLICK);
    expect(ids(watch.take([chat('old', 'acme', CLICK - 1)]))).toEqual([]);
    expect(watch.take([chat('old', 'acme', CLICK - 1), chat('new', 'acme', CLICK + 5)])).toEqual([
      { chat: chat('new', 'acme', CLICK + 5), launchedAt: CLICK, target: ENTRY, mayOpenPanel: true },
    ]);
    expect(watch.take([chat('new', 'acme', CLICK + 5)])).toEqual([]);
  });

  it('matches a shortcut by folder when the name differs', () => {
    const watch: LaunchWatch = watchWithPanel({ current: null });
    watch.expect(SHORTCUT, CLICK);
    expect(ids(watch.take([chat('s', 'renamed', CLICK + 5, '/home/me/code/client-portal')]))).toEqual(['s']);
  });

  it('gives two launches of the same project two different chats', () => {
    const watch: LaunchWatch = watchWithPanel({ current: null });
    watch.expect(ENTRY, CLICK);
    watch.expect(ENTRY, CLICK + 2);
    expect(ids(watch.take([chat('a', 'acme', CLICK + 4)]))).toEqual(['a']);
    expect(ids(watch.take([chat('a', 'acme', CLICK + 4), chat('b', 'acme', CLICK + 6)]))).toEqual(['b']);
  });

  it('gives up after the timeout and says which launch', () => {
    const watch: LaunchWatch = watchWithPanel({ current: null });
    watch.expect(ENTRY, CLICK);
    expect(watch.expire(CLICK + LAUNCH_MATCH_TIMEOUT_MS)).toEqual([]);
    const late: number = CLICK + LAUNCH_MATCH_TIMEOUT_MS + 1;
    expect(watch.expire(late)).toEqual([CLICK]);
    expect(watch.take([chat('new', 'acme', late)])).toEqual([]);
  });

  it('forgets a cancelled launch', () => {
    const watch: LaunchWatch = watchWithPanel({ current: null });
    watch.expect(ENTRY, CLICK);
    watch.cancel(CLICK);
    expect(watch.take([chat('new', 'acme', CLICK + 5)])).toEqual([]);
  });

  it('does not take the panel from a chat the user opened after the click', () => {
    const panel: { current: string | null } = { current: 'mine' };
    const watch: LaunchWatch = watchWithPanel(panel);
    watch.expect(ENTRY, CLICK);
    panel.current = 'other';
    expect(watch.take([chat('new', 'acme', CLICK + 5)])[0]?.mayOpenPanel).toBe(false);
  });

  it('may replace the panel that was open at the click, a closed panel, or one it opened itself', () => {
    const panel: { current: string | null } = { current: 'mine' };
    const watch: LaunchWatch = watchWithPanel(panel);
    watch.expect(ENTRY, CLICK);
    expect(watch.take([chat('a', 'acme', CLICK + 5)])[0]?.mayOpenPanel).toBe(true);
    panel.current = null;
    watch.expect(ENTRY, CLICK + 10);
    panel.current = 'a';
    watch.markOpened('a');
    expect(watch.take([chat('b', 'acme', CLICK + 15)])[0]?.mayOpenPanel).toBe(true);
  });

  it('matches a resumed chat by its session id, each time it is resumed', () => {
    const watch: LaunchWatch = watchWithPanel({ current: null });
    watch.expect(resumedChatTarget('past', 'Old name'), CLICK);
    expect(ids(watch.take([chat('other', 'x', CLICK + 1), chat('past', 'Old name', CLICK + 5)]))).toEqual(['past']);
    watch.expect(resumedChatTarget('past', 'Old name'), CLICK + 100);
    expect(ids(watch.take([chat('past', 'Old name', CLICK + 105)]))).toEqual(['past']);
  });
});
