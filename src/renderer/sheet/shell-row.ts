import type { ShellSnapshot, ShellStatus } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';
import { CLOSE_ICON } from '../icons';

// How a shell row shows right now: Orbit may already be interrupting it before the chat reports it ended.
export interface ShellRowState {
  readonly isStopping: boolean;
  readonly isConfirming: boolean;
  readonly isOpen: boolean;
}

// Stands where agents show their colored dot: a prompt sign reads as "a command" at a glance.
const SHELL_GLYPH: string = '$';
const STATUS_WORDS: Readonly<Record<Exclude<ShellStatus, 'running'>, string>> = { completed: 'done', failed: 'failed', killed: 'killed' };
const STOPPING_WORD: string = 'stopping…';
export const SHELL_ATTRIBUTE: string = 'shell';
export const SHELL_STOP_ATTRIBUTE: string = 'shellStop';

// A background command of the chat: clicking it shows its details; its X interrupts it while running, closes it once done.
// No title: the details are one click away, and a hover tip would only repeat the command.
export function renderShellItem(shell: ShellSnapshot, state: ShellRowState, now: number): HTMLElement {
  const item: HTMLDivElement = element('div', `agent-strip-item${state.isConfirming ? ' is-confirming' : ''}`);
  const row: HTMLButtonElement = element('button', `agent-strip-row agent-strip-shell agent-strip-shell-${shell.status}${state.isOpen ? ' is-current' : ''}`);
  row.type = 'button';
  row.dataset[SHELL_ATTRIBUTE] = shell.id;
  row.append(
    element('span', 'agent-strip-shell-glyph', SHELL_GLYPH),
    element('span', 'agent-strip-name', shellName(shell)),
    element('span', `agent-strip-time agent-strip-shell-${state.isStopping ? 'stopping' : shell.status}`, shellTiming(shell, state, now)),
  );
  item.append(row, renderStopButton(shell));
  return item;
}

export function shellName(shell: ShellSnapshot): string {
  return shell.description ?? firstLine(shell.command);
}

export function shellStatusWord(shell: ShellSnapshot): string {
  return shell.status === 'running' ? 'running' : STATUS_WORDS[shell.status];
}

function shellTiming(shell: ShellSnapshot, state: ShellRowState, now: number): string {
  if (state.isStopping) return STOPPING_WORD;
  return shell.status === 'running' ? formatDuration(now - shell.startedAt) : shellStatusWord(shell);
}

function renderStopButton(shell: ShellSnapshot): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'agent-strip-stop');
  button.type = 'button';
  button.dataset[SHELL_STOP_ATTRIBUTE] = shell.id;
  button.setAttribute('aria-label', `${shell.status === 'running' ? 'Interrupt' : 'Close'} ${shellName(shell)}`);
  button.innerHTML = CLOSE_ICON;
  return button;
}

function firstLine(command: string): string {
  return command.trim().split('\n')[0] ?? command;
}
