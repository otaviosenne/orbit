import type { ChatColor } from '../../shared/chat-colors';
import { CHAT_COLORS } from '../../shared/chat-colors';

export type RandomUnit = () => number;

// A color for a new chat: never the previous new chat's, and one no open chat has while any is left,
// so chats started back to back are told apart at a glance.
export function pickChatColor(previous: ChatColor | null, inUse: readonly (string | null)[], random: RandomUnit): ChatColor {
  const fresh: ChatColor[] = CHAT_COLORS.filter((color: ChatColor) => color !== previous);
  const unused: ChatColor[] = fresh.filter((color: ChatColor) => !inUse.includes(color));
  const pool: ChatColor[] = unused.length > 0 ? unused : fresh;
  return pool[Math.min(Math.floor(random() * pool.length), pool.length - 1)] ?? CHAT_COLORS[0];
}
