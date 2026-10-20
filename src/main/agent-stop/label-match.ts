// Claude Code cuts a label that does not fit the terminal and ends it with this.
const ELLIPSIS: string = '…';

// Whether a label Claude Code draws for a task is the agent's description, whole or cut short.
export function labelMatches(label: string, description: string): boolean {
  const shown: string = label.trim();
  const full: string = description.trim();
  if (shown === full) return true;
  if (!shown.endsWith(ELLIPSIS)) return false;
  const prefix: string = shown.slice(0, -ELLIPSIS.length).trimEnd();
  return prefix.length > 0 && full.startsWith(prefix);
}
