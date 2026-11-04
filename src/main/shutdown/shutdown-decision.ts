import type { ShutdownPlan } from '../../shared/shutdown-plan';

// A chat between two turns (a stop hook, an agent's result coming back) looks idle for a moment; only this long a
// quiet spell means everything finished.
export const IDLE_CONFIRM_MS: number = 2 * 60_000;

// Since when no chat has been working; null while some chat is.
export function nextIdleSince(previous: number | null, workingChats: number, now: number): number | null {
  if (workingChats > 0) return null;
  return previous ?? now;
}

// Whichever of the plan's conditions is met first.
export function isShutdownDue(plan: ShutdownPlan, idleSince: number | null, now: number): boolean {
  const timeReached: boolean = plan.at !== null && now >= plan.at;
  const allDone: boolean = plan.whenIdle && idleSince !== null && now - idleSince >= IDLE_CONFIRM_MS;
  return timeReached || allDone;
}
