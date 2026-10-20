import type { ShellSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';

// Stands where agents show their colored dot: a prompt sign reads as "a command" at a glance.
const SHELL_GLYPH: string = '$';

// A background command of the chat, read only: its description when Claude gave one, else the command itself.
export function renderShellRow(shell: ShellSnapshot, now: number): HTMLElement {
  const row: HTMLDivElement = element('div', 'agent-strip-row agent-strip-shell');
  row.title = shell.command;
  row.append(
    element('span', 'agent-strip-shell-glyph', SHELL_GLYPH),
    element('span', 'agent-strip-name', shell.description ?? firstLine(shell.command)),
    element('span', 'agent-strip-time', formatDuration(now - shell.startedAt)),
  );
  return row;
}

function firstLine(command: string): string {
  return command.trim().split('\n')[0] ?? command;
}
