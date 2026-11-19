import { beforeEach, describe, expect, it } from 'vitest';
import { CLOSE_GRACE_MS } from '../src/renderer/board/closing-chats';
import { PinnedChats } from '../src/renderer/board/pinned-chats';
import { PinnedInfoStore } from '../src/renderer/board/pinned-info';
import { toClosedChatInfo } from '../src/renderer/board/closed-chat-info';
import { OpenChatsMemory, type RememberedChat } from '../src/renderer/restore/open-chats-memory';
import { ClosedChats, toLeftOpenChat, type ClosedChat, type LeftOpenChat } from '../src/renderer/suspend/closed-chats';
import { canSuspendClosed, suspendClosedChat, type ClosedSuspensionHost } from '../src/renderer/suspend/closed-suspension';
import { SuspendedChats } from '../src/renderer/suspend/suspended-chats';
import type { ChatSnapshot } from '../src/shared/types';

const OPEN_CHATS_KEY: string = 'orbit.open-chats';
const RUN: number = 1_000_000;
const SUSPENDED_AT: number = 5_000_000;
const NEW_RUN: number = 6_000_000;
const PAST_GRACE: number = SUSPENDED_AT + CLOSE_GRACE_MS + 1;

function chat(sessionId: string, startedAt: number, name: string = sessionId): ChatSnapshot {
  return {
    sessionId, pid: 7, name, color: 'blue', repository: { name: 'acme', root: '/code/acme' }, cwd: '/code/acme', startedAt,
    status: 'idle', statusSince: startedAt, agents: [], shells: [], lastReplyAt: 4_000_000, isFocused: false, approval: null, ask: null, typing: null, localCi: null,
  };
}

function leftOpenBy(sessionIds: readonly string[]): RememberedChat[] {
  return sessionIds.map((sessionId: string): RememberedChat => ({ sessionId, info: toClosedChatInfo(chat(sessionId, RUN, `Chat ${sessionId}`)), column: 'busy', cutMidWork: true }));
}

interface Board {
  readonly closed: ClosedChats;
  readonly suspended: SuspendedChats;
  readonly openChats: OpenChatsMemory;
  readonly pins: PinnedChats;
  readonly info: PinnedInfoStore;
  readonly host: ClosedSuspensionHost;
}

// The board after a shutdown: nothing is running, and the chats it left open are Closed cards in their column.
function boardAfterShutdown(stored: Map<string, string>, leftOpen: readonly string[]): Board {
  stored.set(OPEN_CHATS_KEY, JSON.stringify(leftOpenBy(leftOpen)));
  const pins: PinnedChats = new PinnedChats();
  const info: PinnedInfoStore = new PinnedInfoStore();
  const suspended: SuspendedChats = new SuspendedChats();
  const openChats: OpenChatsMemory = new OpenChatsMemory(true);
  const live: readonly ChatSnapshot[] = [];
  const closed: ClosedChats = new ClosedChats(pins, info, suspended, (): readonly ChatSnapshot[] => live, (): LeftOpenChat[] => openChats.closed(live).map(toLeftOpenChat));
  const host: ClosedSuspensionHost = {
    addSuspended: (stand: ChatSnapshot): void => suspended.add(stand, SUSPENDED_AT),
    forgetLeftOpen: (sessionId: string): void => openChats.forget(sessionId),
  };
  return { closed, suspended, openChats, pins, info, host };
}

describe('suspending a Closed card', () => {
  let stored: Map<string, string>;

  beforeEach(() => {
    stored = new Map();
    globalThis.localStorage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    } as unknown as Storage;
  });

  it('offers Suspend on Closed cards only, not on a chat that is suspended already', () => {
    expect(canSuspendClosed('left-open')).toBe(true);
    expect(canSuspendClosed('closed-pin')).toBe(true);
    expect(canSuspendClosed('suspended')).toBe(false);
  });

  it('moves a chat a shutdown left open into Suspended, keyed by its session id, with its name and color', () => {
    const board: Board = boardAfterShutdown(stored, ['a', 'b']);
    expect(suspendClosedChat(board.closed.find('a'), board.host)).toBe(true);
    expect(board.closed.find('a')).toMatchObject({ kind: 'suspended', chat: { sessionId: 'a', name: 'Chat a', color: 'blue', pid: 0 } });
    expect(board.closed.leftOpen().map((entry: LeftOpenChat) => entry.chat.sessionId)).toEqual(['b']);
    expect(new SuspendedChats().has('a')).toBe(true);
  });

  it('leaves it only in Suspended, like a suspended open chat, so removing it from there takes it off the board', () => {
    const board: Board = boardAfterShutdown(stored, ['a']);
    suspendClosedChat(board.closed.find('a'), board.host);
    expect(new OpenChatsMemory(true).closed([])).toEqual([]);
    board.suspended.remove('a');
    expect(board.closed.find('a')).toBeUndefined();
  });

  it('keeps a closed pin in the Pinned row, now labelled Suspended, and lists it in Suspended too', () => {
    const board: Board = boardAfterShutdown(stored, []);
    board.pins.pin('p');
    board.info.remember([chat('p', RUN)]);
    expect(board.closed.find('p')?.kind).toBe('closed-pin');
    suspendClosedChat(board.closed.find('p'), board.host);
    expect(board.closed.find('p')?.kind).toBe('suspended');
    expect(board.closed.pinned().map((stand: ChatSnapshot) => stand.sessionId)).toEqual(['p']);
    expect(board.suspended.snapshots().map((stand: ChatSnapshot) => stand.sessionId)).toEqual(['p']);
  });

  it('does nothing for a chat that is suspended already or has no card', () => {
    const board: Board = boardAfterShutdown(stored, ['a']);
    const added: string[] = [];
    const counting: ClosedSuspensionHost = { addSuspended: (stand: ChatSnapshot): void => void added.push(stand.sessionId), forgetLeftOpen: (): void => undefined };
    const suspendedAlready: ClosedChat = { chat: chat('a', 0), kind: 'suspended' };
    expect(suspendClosedChat(suspendedAlready, counting)).toBe(false);
    expect(suspendClosedChat(undefined, counting)).toBe(false);
    expect(added).toEqual([]);
    expect(board.closed.find('a')?.kind).toBe('left-open');
  });

  it('stays suspended with no process behind it, however long it waits', () => {
    const board: Board = boardAfterShutdown(stored, ['a']);
    suspendClosedChat(board.closed.find('a'), board.host);
    board.suspended.settle([], PAST_GRACE);
    expect(board.suspended.has('a')).toBe(true);
  });

  it('leaves Suspended when it is resumed by any path, like any suspended chat', () => {
    const board: Board = boardAfterShutdown(stored, ['a']);
    suspendClosedChat(board.closed.find('a'), board.host);
    const resumed: ChatSnapshot[] = [chat('a', NEW_RUN)];
    expect(board.suspended.visible(resumed).map((live: ChatSnapshot) => live.sessionId)).toEqual(['a']);
    board.suspended.settle(resumed, PAST_GRACE);
    expect(board.suspended.has('a')).toBe(false);
  });
});
