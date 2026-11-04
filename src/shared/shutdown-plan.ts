// A shutdown planned from Settings → Computer: at a time, once no chat is working, or whichever of the two comes first.
export interface ShutdownPlan {
  // When to shut down at the latest; null for no time.
  readonly at: number | null;
  // Shut down as soon as no chat is working (a turn or an agent running; background shells do not count).
  readonly whenIdle: boolean;
}

export interface ShutdownPlanState {
  readonly plan: ShutdownPlan | null;
  readonly workingChats: number;
  // Set while the last minute runs: the moment the machine powers off, which Cancel can still stop.
  readonly countdownEndsAt: number | null;
}

export function parseShutdownPlan(value: unknown): ShutdownPlan | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  const at: unknown = candidate['at'];
  const whenIdle: unknown = candidate['whenIdle'];
  if (typeof whenIdle !== 'boolean' || !(at === null || (typeof at === 'number' && Number.isFinite(at)))) return null;
  return at === null && !whenIdle ? null : { at, whenIdle };
}
