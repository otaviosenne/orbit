import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChatColor } from '../src/shared/chat-colors';
import { CHAT_COLORS } from '../src/shared/chat-colors';
import type { ChatSnapshot } from '../src/shared/types';
import type { LaunchPanelHost, PendingSheet } from '../src/renderer/launch-panel';
import { LaunchPanel } from '../src/renderer/launch-panel';
import { LAUNCH_MATCH_TIMEOUT_MS, LaunchWatch, newChatTarget, resumedChatTarget } from '../src/renderer/launch-watch';
import type { PendingChat } from '../src/renderer/pending-chat';

const CLICK: number = 1_000_000;
const RESUMED_COLOR: string = 'cyan';

function chat(sessionId: string, name: string, startedAt: number): ChatSnapshot {
  return {
    sessionId, pid: 7, name, color: null, repository: { name: 'r', root: '/r' }, cwd: '/r', startedAt,
    status: 'idle', statusSince: startedAt, agents: [], shells: [], lastReplyAt: null, isFocused: false, approval: null, localCi: null,
  };
}

// Records what the panel was asked to do, and plays the open panel the watcher looks at.
class FakeHost implements LaunchPanelHost, PendingSheet {
  readonly sheet: PendingSheet = this;
  readonly colorPreview = { show: (_id: string, color: ChatColor): void => void this.shownColors.push(color), undo: (): void => {} };
  readonly pendings: PendingChat[] = [];
  readonly recolors: [number, string | null][] = [];
  readonly failures: [number, string][] = [];
  readonly opened: string[] = [];
  readonly seen: string[] = [];
  readonly shownColors: ChatColor[] = [];
  panel: string | null = null;
  chats: ChatSnapshot[] = [];
  renders: number = 0;
  canShowPanel = (): boolean => true;
  openChats = (): readonly ChatSnapshot[] => this.chats;
  openChat = (sessionId: string): void => {
    this.opened.push(sessionId);
    this.panel = sessionId;
  };
  markSeen = (target: ChatSnapshot): void => void this.seen.push(target.sessionId);
  render = (): void => void (this.renders += 1);
  openPending(pending: PendingChat): void {
    this.pendings.push(pending);
    this.panel = null;
  }
  recolorPending(launchedAt: number, color: string | null): void {
    this.recolors.push([launchedAt, color]);
  }
  failPending(launchedAt: number, message: string): void {
    this.failures.push([launchedAt, message]);
  }
}

function setUp(): { host: FakeHost; panel: LaunchPanel } {
  const host: FakeHost = new FakeHost();
  return { host, panel: new LaunchPanel(new LaunchWatch((): string | null => host.panel), host) };
}

beforeEach(() => {
  const radar = { getChatColor: async (): Promise<string> => RESUMED_COLOR, recolorChat: async () => ({ ok: true, method: 'socket', error: null }) };
  (globalThis as { window?: unknown }).window = { radar };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('LaunchPanel', () => {
  it('opens a placeholder at the click with the chat name and its new color, then opens the live chat as seen', () => {
    const { host, panel } = setUp();
    panel.expect(newChatTarget({ name: 'acme', command: 'acme repo', chatName: 'Acme', folder: null }), CLICK);
    expect(host.pendings).toHaveLength(1);
    expect(host.pendings[0]?.name).toBe('Acme');
    expect(CHAT_COLORS).toContain(host.pendings[0]?.color);
    host.chats = [chat('new', 'Acme', CLICK + 3)];
    panel.settle(CLICK + 4);
    expect(host.opened).toEqual(['new']);
    expect(host.seen).toEqual(['new']);
    expect(host.shownColors).toEqual([host.pendings[0]?.color]);
  });

  it('shows a resumed chat under its title and recolors it once its color is read', async () => {
    const { host, panel } = setUp();
    panel.expect(resumedChatTarget('past', 'Old chat'), CLICK);
    expect(host.pendings[0]).toEqual({ launchedAt: CLICK, name: 'Old chat', color: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(host.recolors).toEqual([[CLICK, RESUMED_COLOR]]);
  });

  it('turns the placeholder into an error when the launch fails or times out', () => {
    const { host, panel } = setUp();
    const target = newChatTarget({ name: 'acme', command: 'acme repo', chatName: 'Acme', folder: null });
    panel.expect(target, CLICK);
    panel.fail(CLICK, 'boom');
    panel.expect(target, CLICK + 1);
    panel.settle(CLICK + 1 + LAUNCH_MATCH_TIMEOUT_MS + 1);
    expect(host.failures.map(([launchedAt]: [number, string]) => launchedAt)).toEqual([CLICK, CLICK + 1]);
    expect(host.failures[0]?.[1]).toBe('boom');
  });

  it('leaves a chat the user opened meanwhile in the panel, still marking the new one seen', () => {
    const { host, panel } = setUp();
    host.panel = 'mine';
    panel.expect(newChatTarget({ name: 'acme', command: 'acme repo', chatName: 'Acme', folder: null }), CLICK);
    host.panel = 'other';
    host.chats = [chat('new', 'Acme', CLICK + 3)];
    panel.settle(CLICK + 4);
    expect(host.opened).toEqual([]);
    expect(host.seen).toEqual(['new']);
    expect(host.renders).toBe(1);
  });

  it('skips the placeholder where the side panel has no place', () => {
    const { host, panel } = setUp();
    host.canShowPanel = (): boolean => false;
    panel.expect(resumedChatTarget('past', 'Old chat'), CLICK);
    expect(host.pendings).toEqual([]);
  });
});
