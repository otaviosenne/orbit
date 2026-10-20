import type { PermissionMode } from '../../shared/permission-modes';

// The status line under the prompt, e.g. "⏵⏵ bypass permissions on (shift+tab to cycle)" or
// "⏸ manual mode on · ? for shortcuts". It may wrap after "on" in a narrow window.
const INDICATOR_PATTERN: RegExp = /^\s*(?:⏵⏵|⏵|⏸)\s+(bypass permissions|accept edits|plan mode|auto mode|manual mode|don't ask) on\b/;
// Older layouts show only the shortcuts hint while in the default mode.
const SHORTCUTS_ONLY_PATTERN: RegExp = /^\s*\? for shortcuts/;
// The footer sits in the last few lines; anything higher is conversation, which may quote a footer.
const FOOTER_LINES: number = 8;

const INDICATOR_MODES: Readonly<Record<string, PermissionMode>> = {
  'bypass permissions': 'bypassPermissions',
  'accept edits': 'acceptEdits',
  'plan mode': 'plan',
  'auto mode': 'auto',
  'manual mode': 'default',
  "don't ask": 'dontAsk',
};

// The mode shown on the chat's screen right now; null when no footer is visible (a dialog covers it).
export function footerPermissionMode(screen: string): PermissionMode | null {
  const footer: string[] = screen.split('\n').filter((line: string) => line.trim().length > 0).slice(-FOOTER_LINES);
  for (const line of [...footer].reverse()) {
    const indicator: string | undefined = INDICATOR_PATTERN.exec(line)?.[1];
    if (indicator !== undefined) return INDICATOR_MODES[indicator] ?? null;
  }
  return footer.some((line: string) => SHORTCUTS_ONLY_PATTERN.test(line)) ? 'default' : null;
}
