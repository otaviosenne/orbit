import { shellQuote } from './shell-quote';

// The same command the claude-sessions restore script runs, so a chat reopened here behaves like one restored after a reboot.
// A prompt becomes the first message of the resumed chat.
export function buildResumeCommand(cwd: string, sessionId: string, prompt?: string): string {
  const base: string = `kitty --directory ${shellQuote(cwd)} claude --resume ${shellQuote(sessionId)}`;
  return prompt === undefined ? base : `${base} ${shellQuote(prompt)}`;
}
