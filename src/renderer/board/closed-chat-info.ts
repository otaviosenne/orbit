import type { ChatSnapshot } from '../../shared/types';

// What a chat looked like while it was open, so its card can stay on the board after its process is gone.
export interface ClosedChatInfo {
  readonly name: string;
  readonly color: string | null;
  readonly repositoryName: string;
  readonly repositoryRoot: string;
  readonly cwd: string;
  readonly lastReplyAt: number | null;
}

export function toClosedChatInfo(chat: ChatSnapshot): ClosedChatInfo {
  return {
    name: chat.name, color: chat.color, repositoryName: chat.repository.name, repositoryRoot: chat.repository.root,
    cwd: chat.cwd, lastReplyAt: chat.lastReplyAt,
  };
}

// A read-only stand-in for a closed chat: no process behind it, so its pid is 0 and it runs nothing.
export function closedChatSnapshot(sessionId: string, info: ClosedChatInfo): ChatSnapshot {
  return {
    sessionId, pid: 0, name: info.name, color: info.color,
    repository: { name: info.repositoryName, root: info.repositoryRoot }, cwd: info.cwd, startedAt: 0,
    status: 'idle', statusSince: info.lastReplyAt ?? 0, lastReplyAt: info.lastReplyAt,
    agents: [], shells: [], isFocused: false, approval: null, localCi: null,
  };
}
