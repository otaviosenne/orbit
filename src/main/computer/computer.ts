import type { ComputerAction, ComputerStatus } from '../../shared/computer';
import { parseComputerAction } from '../../shared/computer-action';
import type { ActionResult } from '../../shared/types';
import { failure } from '../terminal-input';
import { runComputerAction } from './computer-actions';
import type { CommandRunner } from './command-runner';
import { desktopRunner } from './command-runner';
import { ComputerStatusReader } from './computer-status';

const NOT_AN_ACTION: ActionResult = failure('Unknown computer action');

// The Computer page's way to the desktop: what it looks like now, and the few things it may change.
export class Computer {
  private readonly reader: ComputerStatusReader;

  constructor(private readonly runner: CommandRunner = desktopRunner) {
    this.reader = new ComputerStatusReader(runner);
  }

  status(): Promise<ComputerStatus> {
    return this.reader.status();
  }

  run(raw: unknown): Promise<ActionResult> {
    const action: ComputerAction | null = parseComputerAction(raw);
    return action === null ? Promise.resolve(NOT_AN_ACTION) : runComputerAction(action, this.reader, this.runner);
  }
}
