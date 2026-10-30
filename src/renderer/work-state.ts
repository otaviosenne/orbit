import type { AgentSnapshot, ChatSnapshot, ShellSnapshot } from '../shared/types';

// What a chat is doing for the board. A chat whose only activity is a command left running in the background still
// belongs with the working ones, but its spinner is grey: nothing is thinking, a command is just still going.
export type WorkState = 'working' | 'shell-only' | 'resting';

// A background command running longer than this is a server or a watcher, not work about to finish, so it no longer
// keeps its chat in Working.
export const LONG_SHELL_MS: number = 10 * 60_000;

export function workStateOf(chat: ChatSnapshot, now: number = Date.now()): WorkState {
  if (chat.status === 'busy') return 'working';
  if (chat.status !== 'shell') return 'resting';
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
