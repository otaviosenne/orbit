import type { ChatSnapshot, LauncherEntry } from '../shared/types';

// Claude loads its MCP servers before it registers the session, which takes seconds; a chat that has not
// shown up by then was closed, failed to start, or was renamed, and the launch is given up on.
export const LAUNCH_MATCH_TIMEOUT_MS: number = 60_000;

// What a launch should produce: a new chat, known by the name it was given or its folder, or a resumed
// chat, which keeps its session id.
export type LaunchTarget =
  | { readonly kind: 'new'; readonly chatName: string; readonly folder: string | null }
  | { readonly kind: 'resumed'; readonly sessionId: string; readonly title: string };

export function newChatTarget(entry: LauncherEntry): LaunchTarget {
  return { kind: 'new', chatName: entry.chatName, folder: entry.folder };
}

export function resumedChatTarget(sessionId: string, title: string): LaunchTarget {
  return { kind: 'resumed', sessionId, title };
}

// What to call the chat before it is live.
export function targetName(target: LaunchTarget): string {
  return target.kind === 'new' ? target.chatName : target.title;
}

// A launched chat that has not shown up on the board yet.
export interface PendingLaunch {
  readonly target: LaunchTarget;
  readonly launchedAt: number;
  // The chat whose panel was open at the click, so a panel opened since is left alone.
  readonly panelAtLaunch: string | null;
}

export interface AdoptedChat {
  readonly chat: ChatSnapshot;
  readonly launchedAt: number;
  readonly target: LaunchTarget;
  readonly mayOpenPanel: boolean;
}

// What the New chat and Resume buttons report: a launch about to start, and a launch that failed to.
export interface LaunchListener {
  expect(target: LaunchTarget, launchedAt: number): void;
  fail(launchedAt: number, error: string): void;
}

export type OpenPanel = () => string | null;

// The chat a launch produced: its process started after the click, and it is the chat the target describes.
// The earliest one wins when two launches of the same project are both still waiting.
export function findLaunchedChat(chats: readonly ChatSnapshot[], launch: PendingLaunch, claimed: ReadonlySet<string>): ChatSnapshot | null {
  const candidates: ChatSnapshot[] = chats.filter(
    (chat: ChatSnapshot) => !claimed.has(runKey(chat)) && chat.startedAt >= launch.launchedAt && isTarget(chat, launch.target),
  );
  return candidates.sort((a: ChatSnapshot, b: ChatSnapshot) => a.startedAt - b.startedAt)[0] ?? null;
}

// One run of a chat: a resumed chat keeps its session id, so closing and resuming it again is a new run.
function runKey(chat: ChatSnapshot): string {
  return `${chat.sessionId}@${chat.startedAt}`;
}

function isTarget(chat: ChatSnapshot, target: LaunchTarget): boolean {
  if (target.kind === 'resumed') return chat.sessionId === target.sessionId;
  return chat.name === target.chatName || (target.folder !== null && chat.cwd === target.folder);
}

// Waits for chats launched from New chat or Resume to appear in the poll, so the board can open them right away.
export class LaunchWatch {
  private pending: PendingLaunch[] = [];
  // Kept across polls: a second launch of the same project must not take the chat the first one produced.
  private readonly claimed: Set<string> = new Set();
  // Panels this watcher opened itself may be switched to the next launched chat; any other panel is the user's.
  private readonly opened: Set<string> = new Set();

  constructor(private readonly openPanel: OpenPanel) {}

  expect(target: LaunchTarget, launchedAt: number): void {
    this.pending.push({ target, launchedAt, panelAtLaunch: this.openPanel() });
  }

  cancel(launchedAt: number): void {
    this.pending = this.pending.filter((launch: PendingLaunch) => launch.launchedAt !== launchedAt);
  }

  // Drops the launches that waited too long and says which they were.
  expire(now: number): number[] {
    const expired: PendingLaunch[] = this.pending.filter((launch: PendingLaunch) => now - launch.launchedAt > LAUNCH_MATCH_TIMEOUT_MS);
    this.pending = this.pending.filter((launch: PendingLaunch) => !expired.includes(launch));
    return expired.map((launch: PendingLaunch) => launch.launchedAt);
  }

  // The launched chats found in this poll.
  take(chats: readonly ChatSnapshot[]): AdoptedChat[] {
    const adopted: AdoptedChat[] = [];
    for (const launch of [...this.pending]) {
      const chat: ChatSnapshot | null = findLaunchedChat(chats, launch, this.claimed);
      if (chat === null) continue;
      this.claimed.add(runKey(chat));
      this.pending = this.pending.filter((candidate: PendingLaunch) => candidate !== launch);
      adopted.push({ chat, launchedAt: launch.launchedAt, target: launch.target, mayOpenPanel: this.mayReplacePanel(launch) });
    }
    return adopted;
  }

  markOpened(sessionId: string): void {
    this.opened.add(sessionId);
  }

  private mayReplacePanel(launch: PendingLaunch): boolean {
    const panel: string | null = this.openPanel();
    return panel === null || panel === launch.panelAtLaunch || this.opened.has(panel);
  }
}
