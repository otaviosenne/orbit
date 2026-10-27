import type { ChatSnapshot } from '../../shared/types';
import { toClosedChatInfo, type ClosedChatInfo } from '../board/closed-chat-info';
import { isMidWork } from '../pause/pause-targets';
import type { ColumnKey } from '../views/board-columns';

const STORAGE_KEY: string = 'orbit.open-chats';
// A chat missing this long while Orbit watched it was closed on purpose. A shutdown takes Orbit down within seconds
// of the chats, so the chats it was killed with are never forgotten and come back at the next start.
export const FORGET_AFTER_MISSING_MS: number = 30_000;

export interface RememberedChat {
  readonly sessionId: string;
  readonly info: ClosedChatInfo;
  // Where its card was on the board, so a chat left open by a shutdown keeps its place while closed.
  readonly column: ColumnKey;
  // Its turn or an agent was running when Orbit last saw it: a shutdown cut it off midway. Kept apart from the column,
  // which also holds chats that only finished a reply or run a shell.
  readonly cutMidWork?: boolean;
}

export type ColumnOf = (chat: ChatSnapshot) => ColumnKey;

// The chats that were open the last time Orbit watched. The ones gone at the next start stay on the board as closed cards.
export class OpenChatsMemory {
  private chats: RememberedChat[] = load();
  // Only chats seen live in this run can be judged closed; the ones loaded from disk have not had the chance yet.
  private readonly missingSince: Map<string, number> = new Map();
  private readonly seenLive: Set<string> = new Set();

  // Called with every poll: remembers what is open and forgets what stayed gone while Orbit was watching.
  observe(live: readonly ChatSnapshot[], columnOf: ColumnOf, now: number): void {
    const before: string = JSON.stringify(this.chats);
    live.forEach((chat: ChatSnapshot): void => this.see(chat, columnOf(chat)));
    this.chats.filter((chat: RememberedChat) => !live.some((candidate: ChatSnapshot) => candidate.sessionId === chat.sessionId))
      .forEach((chat: RememberedChat): void => this.miss(chat.sessionId, now));
    if (JSON.stringify(this.chats) !== before) save(this.chats);
  }

  // Read when the chat is reopened, before the first poll of the live chat overwrites it.
  wasCutMidWork(sessionId: string): boolean {
    return this.chats.some((chat: RememberedChat) => chat.sessionId === sessionId && chat.cutMidWork === true);
  }

  forget(sessionId: string): void {
    this.chats = this.chats.filter((chat: RememberedChat) => chat.sessionId !== sessionId);
    this.missingSince.delete(sessionId);
    save(this.chats);
  }

  // The remembered chats that are not open now, oldest first.
  closed(live: readonly ChatSnapshot[]): RememberedChat[] {
    return this.chats.filter((chat: RememberedChat) => !live.some((candidate: ChatSnapshot) => candidate.sessionId === chat.sessionId));
  }

  private see(chat: ChatSnapshot, column: ColumnKey): void {
    this.seenLive.add(chat.sessionId);
    this.missingSince.delete(chat.sessionId);
    const entry: RememberedChat = { sessionId: chat.sessionId, info: toClosedChatInfo(chat), column, cutMidWork: isMidWork(chat) };
    const isKnown: boolean = this.chats.some((remembered: RememberedChat) => remembered.sessionId === chat.sessionId);
    this.chats = isKnown ? this.chats.map((remembered: RememberedChat) => (remembered.sessionId === chat.sessionId ? entry : remembered)) : [...this.chats, entry];
  }

  private miss(sessionId: string, now: number): void {
    if (!this.seenLive.has(sessionId)) return;
    const since: number = this.missingSince.get(sessionId) ?? now;
    this.missingSince.set(sessionId, since);
    if (now - since > FORGET_AFTER_MISSING_MS) this.chats = this.chats.filter((chat: RememberedChat) => chat.sessionId !== sessionId);
  }
}

function load(): RememberedChat[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(isRemembered) : [];
  } catch {
    return [];
  }
}

function isRemembered(value: unknown): value is RememberedChat {
  const chat: Partial<RememberedChat> = (value ?? {}) as Partial<RememberedChat>;
  return typeof chat.sessionId === 'string' && typeof chat.column === 'string' && typeof chat.info === 'object' && chat.info !== null;
}

function save(chats: readonly RememberedChat[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch {
    // Not persisted: chats are then only brought back while Orbit stays open.
  }
}
