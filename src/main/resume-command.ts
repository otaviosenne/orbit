import { shellQuote } from './shell-quote';

// The same command the claude-sessions restore script runs, so a chat reopened here behaves like one restored after a reboot.
export function buildResumeCommand(cwd: string, sessionId: string): string {
  return `kitty --directory ${shellQuote(cwd)} claude --resume ${shellQuote(sessionId)}`;
}
