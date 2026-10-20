import { submitThroughKitty } from '../kitty-remote';
import type { PickerStep } from '../questions/picker-keys';
import { keys, text } from '../questions/picker-keys';
import type { PickerTerminal } from '../questions/picker-terminal';
import { delay } from '../run-command';
import { labelMatches } from './label-match';
import type { TaskRow, TasksScreen } from './tasks-screen';
import { parseTasksScreen, selectedIndex } from './tasks-screen';

// Claude Code's own "view and manage everything running in the background"; it runs even mid-turn.
const TASKS_COMMAND: string = '/tasks';
const STOP_KEY: string = 'x';
// Closes any task's details; unlike Escape it can never interrupt the chat if the dialog is already gone.
const CLOSE_DETAIL_KEY: string = ' ';
// How long the dialog gets to appear or redraw after a key, checked this often.
const REDRAW_TIMEOUT_MS: number = 3000;
const REDRAW_POLL_MS: number = 100;
// Enough to open a list's row and then close its details.
const MAX_CLOSE_STEPS: number = 3;

export type AgentLookup = 'shown' | 'missing' | 'ambiguous' | 'no-dialog';

// Drives `/tasks` in a chat's terminal to the details of one agent, found by its description, and stops it there.
export class TasksDialog {
  constructor(private readonly terminal: PickerTerminal, private readonly windowPid: number) {}

  // Ends with that agent's details on screen, or says why not; the dialog may be left open either way.
  async showAgent(description: string): Promise<AgentLookup> {
    await submitThroughKitty(this.windowPid, TASKS_COMMAND, { asPaste: false, attachments: [] });
    const opened: TasksScreen | null = await this.waitFor((screen: TasksScreen | null) => screen !== null);
    if (opened === null) return 'no-dialog';
    // A lone task opens straight on its details.
    if (opened.kind === 'detail') return this.isShowing(opened, description) ? 'shown' : 'missing';
    const matches: number = opened.rows.filter((row: TaskRow) => isAgentRow(row, description)).length;
    if (matches !== 1) return matches === 0 ? 'missing' : 'ambiguous';
    if (!(await this.select(description))) return 'missing';
    await this.terminal.run([keys('enter')]);
    const details: TasksScreen | null = await this.waitFor((screen: TasksScreen | null) => screen?.kind === 'detail');
    return details !== null && this.isShowing(details, description) ? 'shown' : 'missing';
  }

  // Checked again right before the key: x on any other task's details would stop the wrong one.
  async stopShown(description: string): Promise<boolean> {
    if (!this.isShowing(await this.read(), description)) return false;
    await this.terminal.run([text(STOP_KEY)]);
    // The details give way to the list, or the whole dialog closes when it was the last task; close() acts on that.
    await this.waitFor((screen: TasksScreen | null) => !this.isShowing(screen, description));
    return true;
  }

  // Never sends Escape unless an empty list is showing: an empty list cannot vanish on its own,
  // while Escape reaching the chat itself would interrupt its turn.
  async close(): Promise<void> {
    for (let step: number = 0; step < MAX_CLOSE_STEPS; step++) {
      const screen: TasksScreen | null = await this.read();
      if (screen === null) return;
      await this.terminal.run([closeStep(screen)]);
      await this.waitFor((next: TasksScreen | null) => next?.kind !== screen.kind);
    }
  }

  private isShowing(screen: TasksScreen | null, description: string): boolean {
    return screen?.kind === 'detail' && screen.agentLabel !== null && labelMatches(screen.agentLabel, description);
  }

  // One arrow at a time, re-reading the list after each, since rows come and go as tasks end.
  private async select(description: string): Promise<boolean> {
    for (let step: number = 0; ; step++) {
      const screen: TasksScreen | null = await this.read();
      if (screen?.kind !== 'list') return false;
      const target: number = screen.rows.findIndex((row: TaskRow) => isAgentRow(row, description));
      const current: number = selectedIndex(screen);
      if (target < 0 || current < 0 || step > screen.rows.length) return false;
      if (target === current) return true;
      await this.terminal.run([keys(target > current ? 'down' : 'up')]);
      await this.waitFor((next: TasksScreen | null) => next === null || selectedIndex(next) !== current);
    }
  }

  private async read(): Promise<TasksScreen | null> {
    return parseTasksScreen(await this.terminal.plainScreen());
  }

  private async waitFor(accept: (screen: TasksScreen | null) => boolean): Promise<TasksScreen | null> {
    const deadline: number = Date.now() + REDRAW_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const screen: TasksScreen | null = await this.read();
      if (accept(screen)) return screen;
      await delay(REDRAW_POLL_MS);
    }
    return null;
  }
}

function isAgentRow(row: TaskRow, description: string): boolean {
  return row.isAgent && labelMatches(row.label, description);
}

// Details close on Space; a list closes by opening its selected row and closing that; only an empty list needs Escape.
function closeStep(screen: TasksScreen): PickerStep {
  if (screen.kind === 'detail') return text(CLOSE_DETAIL_KEY);
  return screen.rows.length > 0 ? keys('enter') : keys('escape');
}
