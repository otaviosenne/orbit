import type { ChatSnapshot } from './types';

// When a resting chat last did something worth reading: its last reply. The status time also moves when a
// chat is merely reopened (a resume after a reboot), so it only stands in for a chat that has not replied yet.
export function restingSince(chat: ChatSnapshot): number {
  return chat.lastReplyAt ?? chat.statusSince;
}

// How long the chat has been in its current state, as the board and panel show it.
export function statusAge(chat: ChatSnapshot, now: number): number {
  return now - (chat.status === 'idle' ? restingSince(chat) : chat.statusSince);
}
