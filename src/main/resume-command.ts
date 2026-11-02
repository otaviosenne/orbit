import { shellQuote } from './shell-quote';

// The same command the claude-sessions restore script runs, so a chat reopened here behaves like one restored after a reboot.
// It takes no prompt: an interactive `claude --resume` ignores one, so messages go in afterwards (resumed-chat-message.ts).
export function buildResumeCommand(cwd: string, sessionId: string): string {
  return `kitty --directory ${shellQuote(cwd)} claude --resume ${shellQuote(sessionId)}`;
}
