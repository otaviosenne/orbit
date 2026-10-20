import { CHAT_COLORS } from '../shared/chat-colors';
import type { ChatColor } from '../shared/chat-colors';
import { colorHex } from './palette';

// Multiplier of the classic string hash (Java's String.hashCode).
const HASH_MULTIPLIER: number = 31;

// Agents have no color of their own, so each gets a stable one from its id, the same on every refresh.
export function agentColor(agentId: string): string {
  let hash: number = 0;
  for (const character of agentId) hash = (hash * HASH_MULTIPLIER + character.charCodeAt(0)) >>> 0;
  const color: ChatColor = CHAT_COLORS[hash % CHAT_COLORS.length] ?? 'blue';
  return colorHex(color);
}
