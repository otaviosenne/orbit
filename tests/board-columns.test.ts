import { describe, expect, it } from 'vitest';
import { ACTIVE_WINDOW_MS, toBoardColumns } from '../src/renderer/views/board-columns';
import type { AgentSnapshot, ChatSnapshot, ChatStatus } from '../src/shared/types';
import { workStateOf } from '../src/renderer/work-state';

const NOW: number = 100 * ACTIVE_WINDOW_MS;

function chat(name: string, status: ChatStatus, finishedAgo: number = 0): ChatSnapshot {
  return {
    sessionId: name, pid: 1, name, color: null, repository: { name: 'repo', root: '/repo' }, cwd: '/repo', startedAt: 0,
    status, statusSince: NOW - finishedAgo, agents: [], shells: [], lastReplyAt: null, isFocused: false,
  };
}

const names = (columns: ReturnType<typeof toBoardColumns>): string[][] => columns.map((column) => column.chats.map((item) => item.name));

describe('toBoardColumns', () => {
  it('puts unseen finished chats and permission prompts in Needs you, then splits seen ones by age', () => {
    const unseen = (item: ChatSnapshot): boolean => item.name === 'fresh';
    const chats: ChatSnapshot[] = [
      chat('fresh', 'idle'),
      chat('asking', 'waiting'),
      chat('running', 'busy'),
      chat('recent', 'idle', ACTIVE_WINDOW_MS - 1),
      chat('old', 'idle', ACTIVE_WINDOW_MS + 1),
    ];
    expect(names(toBoardColumns(chats, unseen, NOW))).toEqual([['fresh', 'asking'], ['running'], ['recent'], ['old']]);
  });

  it('keeps a resting chat where it was dragged, whatever its age', () => {
    const never = (): boolean => false;
    const chats: ChatSnapshot[] = [chat('recent', 'idle', ACTIVE_WINDOW_MS - 1), chat('old', 'idle', ACTIVE_WINDOW_MS + 1)];
    const pin = (item: ChatSnapshot): 'active' | 'idle' | null => (item.name === 'recent' ? 'idle' : 'active');
    expect(names(toBoardColumns(chats, never, NOW, pin))).toEqual([[], [], ['old'], ['recent']]);
  });

  it('never lets a pin pull a working or waiting chat out of its column', () => {
    const never = (): boolean => false;
    const pin = (): 'idle' => 'idle';
    expect(names(toBoardColumns([chat('running', 'busy'), chat('asking', 'waiting')], never, NOW, pin))).toEqual([['asking'], ['running'], [], []]);
  });

  // The phone shows the board as one list in this same order (web.css flattens the columns, keeping it).
  it('gives the groups in reading order: Needs you, Working, Active, Idle', () => {
    const never = (): boolean => false;
    const columns = toBoardColumns([], never, NOW);
    expect(columns.map((column) => column.key)).toEqual(['needs', 'busy', 'active', 'idle']);
    expect(columns.map((column) => column.title)).toEqual(['Needs you', 'Working', 'Active', 'Idle']);
  });

  it('lists unseen chats first inside a column', () => {
    const unseen = (item: ChatSnapshot): boolean => item.name === 'b';
    expect(toBoardColumns([chat('a', 'waiting'), chat('b', 'idle')], unseen, NOW)[0]?.chats.map((item) => item.name)).toEqual(['b', 'a']);
  });
});

describe('Needs you order', () => {
  it('puts the chat that finished most recently on top', () => {
    const unseen = (item: ChatSnapshot): boolean => item.status === 'idle';
    const chats: ChatSnapshot[] = [chat('old', 'idle', 600_000), chat('asking', 'waiting', 120_000), chat('new', 'idle', 5_000)];
    expect(names(toBoardColumns(chats, unseen, NOW))[0]).toEqual(['new', 'asking', 'old']);
  });
});

describe('a chat with only a background shell running', () => {
  const never = (): boolean => false;
  const runningAgent = { state: 'running' } as AgentSnapshot;

  it('sits in Working, whatever its age, and not in Active or Idle', () => {
    const chats: ChatSnapshot[] = [chat('building', 'shell', ACTIVE_WINDOW_MS + 1), chat('watching', 'shell')];
    expect(names(toBoardColumns(chats, never, NOW))).toEqual([[], ['building', 'watching'], [], []]);
  });

  it('still goes to Needs you when its reply is unseen', () => {
    expect(names(toBoardColumns([chat('building', 'shell')], () => true, NOW))).toEqual([['building'], [], [], []]);
  });

  it('shows a grey spinner for the shell alone, and the usual one once an agent also runs', () => {
    expect(workStateOf(chat('a', 'shell'))).toBe('shell-only');
    expect(workStateOf({ ...chat('a', 'shell'), agents: [runningAgent] })).toBe('working');
    expect(workStateOf(chat('a', 'busy'))).toBe('working');
    expect(workStateOf(chat('a', 'idle'))).toBe('resting');
  });
});

describe('the time in Active after reading', () => {
  const never = (): boolean => false;
  const noPin = (): null => null;

  it('restarts when the chat is read, so one read long after it finished lands in Active', () => {
    const old: ChatSnapshot = chat('old', 'idle', 3 * ACTIVE_WINDOW_MS);
    const readJustNow = (): number => NOW - 1;
    expect(names(toBoardColumns([old], never, NOW, noPin, readJustNow))).toEqual([[], [], ['old'], []]);
  });

  it('runs out a full window after the last read', () => {
    const old: ChatSnapshot = chat('old', 'idle', 3 * ACTIVE_WINDOW_MS);
    const readLongAgo = (): number => NOW - ACTIVE_WINDOW_MS - 1;
    expect(names(toBoardColumns([old], never, NOW, noPin, readLongAgo))).toEqual([[], [], [], ['old']]);
  });

  it('keeps a chat being read in Active', () => {
    const old: ChatSnapshot = chat('old', 'idle', 3 * ACTIVE_WINDOW_MS);
    const beingRead = (_chat: ChatSnapshot, now: number): number => now;
    expect(names(toBoardColumns([old], never, NOW, noPin, beingRead))).toEqual([[], [], ['old'], []]);
  });
});
