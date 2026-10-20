import type { ChatColor } from '../shared/chat-colors';
import { isChatColor } from '../shared/chat-colors';

// Tag colors live in the stylesheet so they follow the light/dark theme like macOS system colors.
// A chat that never got a /color shows as blue, the macOS accent, rather than a grey that looks disabled.
const DEFAULT_TAG: ChatColor = 'blue';

export function chatColor(name: string | null): string {
  return colorHex(name !== null && isChatColor(name) ? name : DEFAULT_TAG);
}

// Dark text only where white would wash out: the yellow tag.
const DARK_TEXT_COLORS: ReadonlySet<string> = new Set(['yellow']);
const DARK_TEXT: string = '#1d1d1f';
const LIGHT_TEXT: string = '#ffffff';

export function textOnChatColor(name: string | null): string {
  return name !== null && DARK_TEXT_COLORS.has(name) ? DARK_TEXT : LIGHT_TEXT;
}

export function colorHex(color: ChatColor): string {
  return `var(--tag-${color})`;
}
