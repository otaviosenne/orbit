// The colors Claude Code's /color command accepts.
export const CHAT_COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'] as const;

export type ChatColor = (typeof CHAT_COLORS)[number];

export function isChatColor(value: string): value is ChatColor {
  return (CHAT_COLORS as readonly string[]).includes(value);
}
