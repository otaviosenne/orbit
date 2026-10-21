import type { ActionResult, ShellOutput, ShellSnapshot } from '../../shared/types';
import { ShellDetails } from './shell-details';
import { ShellDismissals } from './shell-dismissals';
import { renderShellItem, shellName, SHELL_ATTRIBUTE, SHELL_STOP_ATTRIBUTE } from './shell-row';
import type { StripConfirmPopover } from './strip-confirm-popover';

export type ProblemReporter = (problem: string) => void;

const CONFIRM_KEY_PREFIX: string = 'shell:';

// The strip's background shells: their rows, the details a click opens, and what their X does.
export class ShellColumn {
  private readonly dismissals: ShellDismissals = new ShellDismissals();
  // Interrupts sent and not yet reported as ended by the chat; the row says "stopping…" meanwhile.
  private readonly stopping: Set<string> = new Set();
  private readonly details: ShellDetails = new ShellDetails((sessionId: string, taskId: string): Promise<ShellOutput | null> =>
    window.radar.getShellOutput(sessionId, taskId),
  );
  private sessionId: string | null = null;
  private shells: readonly ShellSnapshot[] = [];
  private now: number = 0;

  constructor(
    private readonly confirm: StripConfirmPopover,
    private readonly onChange: () => void,
    private readonly report: ProblemReporter,
  ) {}

  update(sessionId: string, shells: readonly ShellSnapshot[], now: number): void {
    if (sessionId !== this.sessionId) this.details.close();
    this.sessionId = sessionId;
    this.shells = [...shells].sort((a: ShellSnapshot, b: ShellSnapshot) => a.startedAt - b.startedAt);
    this.now = now;
    for (const shell of shells) if (shell.status !== 'running') this.stopping.delete(shell.id);
    this.details.update(shells.find((shell: ShellSnapshot) => shell.id === this.details.openFor), now);
  }

  reset(): void {
    this.details.close();
  }

  rows(): HTMLElement[] {
    return this.visible().map((shell: ShellSnapshot) =>
      renderShellItem(
        shell,
        {
          isStopping: this.stopping.has(shell.id),
          isConfirming: this.confirm.openFor === confirmKey(shell.id),
          isOpen: this.details.openFor === shell.id,
        },
        this.now,
      ),
    );
  }

  // Returns whether the press was on a shell row or its X, which this column then handles.
  handlePress(target: HTMLElement): boolean {
    const stop: HTMLElement | null = target.closest<HTMLElement>('[data-shell-stop]');
    if (stop !== null) return this.withShell(stop.dataset[SHELL_STOP_ATTRIBUTE], (shell: ShellSnapshot) => this.askToStop(shell, stop));
    const row: HTMLElement | null = target.closest<HTMLElement>('[data-shell]');
    if (row !== null) return this.withShell(row.dataset[SHELL_ATTRIBUTE], (shell: ShellSnapshot) => this.toggleDetails(shell, row));
    return false;
  }

  private visible(): ShellSnapshot[] {
    return this.shells.filter((shell: ShellSnapshot) => !this.dismissals.has(shell.id));
  }

  private withShell(taskId: string | undefined, act: (shell: ShellSnapshot) => void): boolean {
    const shell: ShellSnapshot | undefined = this.visible().find((candidate: ShellSnapshot) => candidate.id === taskId);
    if (shell !== undefined) act(shell);
    return true;
  }

  private toggleDetails(shell: ShellSnapshot, row: HTMLElement): void {
    if (this.details.openFor === shell.id) this.details.close();
    else if (this.sessionId !== null) this.details.show(this.sessionId, shell, row.getBoundingClientRect(), this.now);
    this.onChange();
  }

  // A running command is interrupted; a finished one is only taken off the list, in Orbit alone.
  private askToStop(shell: ShellSnapshot, button: HTMLElement): void {
    if (this.confirm.justClosed(confirmKey(shell.id))) return;
    const isRunning: boolean = shell.status === 'running' && !this.stopping.has(shell.id);
    this.confirm.open(
      {
        key: confirmKey(shell.id),
        title: shellName(shell),
        action: isRunning ? 'Interrupt' : 'Close',
        run: (): void => (isRunning ? void this.interrupt(shell.id) : this.close(shell.id)),
      },
      button.getBoundingClientRect(),
    );
    this.onChange();
  }

  private close(taskId: string): void {
    this.dismissals.add(taskId);
    if (this.details.openFor === taskId) this.details.close();
    this.onChange();
  }

  // Optimistic: the row says "stopping…" at once and goes back to running with the reason if the interrupt failed.
  private async interrupt(taskId: string): Promise<void> {
    const sessionId: string | null = this.sessionId;
    if (sessionId === null) return;
    this.stopping.add(taskId);
    this.onChange();
    const result: ActionResult = await requestInterrupt(sessionId, taskId);
    if (result.ok) return;
    this.stopping.delete(taskId);
    this.onChange();
    this.report(`Could not interrupt the command: ${result.error ?? 'unknown error'}`);
  }
}

export function confirmKey(taskId: string): string {
  return `${CONFIRM_KEY_PREFIX}${taskId}`;
}

async function requestInterrupt(sessionId: string, taskId: string): Promise<ActionResult> {
  try {
    return await window.radar.interruptShell(sessionId, taskId);
  } catch (error: unknown) {
    return { ok: false, method: null, error: error instanceof Error ? error.message : String(error) };
  }
}
