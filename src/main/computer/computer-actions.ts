import type { ComputerAction, ComputerStatus } from '../../shared/computer';
import type { ActionResult } from '../../shared/types';
import { failure } from '../terminal-input';
import type { ActionPlan } from './action-plan';
import { planAction } from './action-plan';
import type { CommandRunner } from './command-runner';
import type { ComputerStatusReader } from './computer-status';

// Long enough for the answer to reach the phone before the machine sleeps or goes down.
const POWER_DELAY_MS: number = 1500;
const ACTION_TIMEOUT_MS: number = 5000;
const DONE: ActionResult = { ok: true, method: null, error: null };

export async function runComputerAction(action: ComputerAction, reader: ComputerStatusReader, runner: CommandRunner): Promise<ActionResult> {
  const status: ComputerStatus = await reader.status();
  const plan: ActionPlan | string = planAction(action, { audio: status.audio, apps: status.apps });
  if (typeof plan === 'string') return failure(plan);
  if (plan.mode === 'power') {
    setTimeout((): void => runner.launch(plan.command), POWER_DELAY_MS);
    return DONE;
  }
  if (plan.mode === 'launch') runner.launch(plan.command);
  const ran: boolean = plan.mode === 'launch' || (await runner.output(plan.command, ACTION_TIMEOUT_MS)) !== null;
  if (plan.changes !== null) reader.invalidate(plan.changes);
  return ran ? DONE : failure(`${plan.command.file} failed`);
}
