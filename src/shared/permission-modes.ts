// The modes Shift+Tab cycles through in Claude Code 2.1.x, in its order. Bypass and auto are skipped by the
// cycle when the chat does not allow them (bypass needs a chat started with it allowed).
export const CYCLED_PERMISSION_MODES = ['default', 'acceptEdits', 'plan', 'bypassPermissions', 'auto'] as const;
export type CycledPermissionMode = (typeof CYCLED_PERMISSION_MODES)[number];

// dontAsk is never in the cycle, but a chat started with it reports it.
export type PermissionMode = CycledPermissionMode | 'dontAsk';

const ALL_PERMISSION_MODES: readonly PermissionMode[] = [...CYCLED_PERMISSION_MODES, 'dontAsk'];

export function isPermissionMode(value: unknown): value is PermissionMode {
  return typeof value === 'string' && (ALL_PERMISSION_MODES as readonly string[]).includes(value);
}

export function isCycledPermissionMode(value: unknown): value is CycledPermissionMode {
  return typeof value === 'string' && (CYCLED_PERMISSION_MODES as readonly string[]).includes(value);
}

// Claude Code's own short titles (its footer calls the default mode "manual").
export const PERMISSION_MODE_TITLES: Readonly<Record<PermissionMode, string>> = {
  default: 'Manual',
  acceptEdits: 'Accept edits',
  plan: 'Plan',
  bypassPermissions: 'Bypass',
  auto: 'Auto',
  dontAsk: "Don't ask",
};
