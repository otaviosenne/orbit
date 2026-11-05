import type { AgentSnapshot, ChatSnapshot, ShellSnapshot } from '../shared/types';

// What a chat is doing for the board. A chat whose only activity is a command left running in the background still
// belongs with the working ones, but its spinner is grey: nothing is thinking, a command is just still going. The
// CI is the exception: it is the work itself, so its chat keeps spinning however long it runs, in green like the
// panel's local CI bar, so a chat checking its work stands apart from one still writing it.
export type WorkState = 'working' | 'ci' | 'shell-only' | 'resting';

// A background command running longer than this is a server or a watcher, not work about to finish, so it no longer
// keeps its chat in Working.
export const LONG_SHELL_MS: number = 10 * 60_000;

export function workStateOf(chat: ChatSnapshot, now: number = Date.now()): WorkState {
  if (chat.status !== 'busy' && chat.status !== 'shell') return 'resting';
  if (chat.runsCi === true || chat.localCi !== null) return 'ci';
  if (chat.status === 'busy') return 'working';
  if (chat.agents.some((agent: AgentSnapshot) => agent.state === 'running')) return 'working';
  return onlyLongShells(chat.shells, now) ? 'resting' : 'shell-only';
}

export function isWorking(chat: ChatSnapshot, now: number = Date.now()): boolean {
  return workStateOf(chat, now) !== 'resting';
}

// With no running command listed there is nothing to time, so the chat keeps the status Claude Code gave it.
function onlyLongShells(shells: readonly ShellSnapshot[], now: number): boolean {
  const running: readonly ShellSnapshot[] = shells.filter((shell: ShellSnapshot) => shell.status === 'running');
  return running.length > 0 && running.every((shell: ShellSnapshot) => now - shell.startedAt > LONG_SHELL_MS);
}
