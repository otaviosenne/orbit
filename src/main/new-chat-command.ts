import type { LauncherEntry } from '../shared/types';
import { shellQuote } from './shell-quote';

// Keeps the shell open after the chat exits, like the SUPER+D launcher does.
const KEEP_SHELL_OPEN: string = 'exec bash';

// The kitty command for a new chat named entry.chatName. Interactive bash because the launchers live in ~/.bashrc.
export function buildNewChatCommand(entry: LauncherEntry): string {
  if (entry.folder !== null) {
    return `kitty --directory ${shellQuote(entry.folder)} bash -ic ${shellQuote(`claude --name ${shellQuote(entry.chatName)}; ${KEEP_SHELL_OPEN}`)}`;
  }
  return `kitty bash -ic ${shellQuote(`${namingClaude(entry.chatName)}; ${entry.command}; ${KEEP_SHELL_OPEN}`)}`;
}

// The ~/.bashrc launchers run a bare `claude` deep inside their own functions; shadowing it for this one shell names
// the chat without editing any of them. The fresh shell that `exec bash` starts afterwards no longer has it.
function namingClaude(chatName: string): string {
  return `claude() { command claude --name ${shellQuote(chatName)} "$@"; }`;
}
