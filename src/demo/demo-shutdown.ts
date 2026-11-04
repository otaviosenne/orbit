import type { ShutdownPlan, ShutdownPlanState } from '../shared/shutdown-plan';
import { parseShutdownPlan } from '../shared/shutdown-plan';
import type { ActionResult } from '../shared/types';

const DONE: ActionResult = { ok: true, method: 'socket', error: null };
// Two demo chats are busy; a planned shutdown is only remembered, never carried out.
const DEMO_WORKING_CHATS: number = 2;

let plan: ShutdownPlan | null = null;

export const demoShutdown = {
  state: (): ShutdownPlanState => ({ plan, workingChats: DEMO_WORKING_CHATS, countdownEndsAt: null }),
  set: (value: unknown): ActionResult => {
    plan = parseShutdownPlan(value);
    return plan === null ? { ok: false, method: null, error: 'Choose a time, or to wait for the chats, or both' } : DONE;
  },
  cancel: (): ActionResult => {
    plan = null;
    return DONE;
  },
};
