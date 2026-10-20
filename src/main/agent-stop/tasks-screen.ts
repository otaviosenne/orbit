// One row of the background-tasks list: a shell, an agent or anything else Claude Code runs in the background.
export interface TaskRow {
  readonly label: string;
  readonly isAgent: boolean;
  readonly isSelected: boolean;
}

// What `/tasks` shows: the list of tasks, or one task's details (an agent's, or null for a shell's).
export type TasksScreen =
  | { readonly kind: 'list'; readonly rows: readonly TaskRow[] }
  | { readonly kind: 'detail'; readonly agentLabel: string | null };

const LIST_TITLE: string = 'Background';
const LIST_FOOTER: string = '↑/↓ to select';
const DETAIL_FOOTER: string = '← to go back';
const RULE: RegExp = /^─+$/;
const SECTION: RegExp = /^\S.* \(\d+\)$/;
const AGENT_SECTION: RegExp = /^Local agents \(\d+\)$/;
// "  ❯ ● Agent J: count   running · Sonnet 5.5": cursor column, status dot, label, then the status past a wide gap.
const ROW: RegExp = /^ {2}([❯ ]) \S (.+?)(?: {2,}\S.*)?$/;
const CURSOR: string = '❯';
// An agent's details open on "general-purpose › Agent J: count"; a shell's on "Shell details".
const AGENT_TITLE: RegExp = /^\S.*? › (.+)$/;

// Reads the dialog from a plain-text screen capture; null when no tasks dialog is showing.
export function parseTasksScreen(screen: string): TasksScreen | null {
  const lines: string[] = screen.split('\n').map((line: string) => line.trimEnd());
  const footer: number = findLastIndex(lines, isDialogFooter);
  if (footer < 0) return null;
  const body: string[] = lines.slice(lastRuleBefore(lines, footer) + 1, footer);
  const title: string | undefined = body.find((line: string) => line.trim() !== '')?.trim();
  if (title === undefined) return null;
  if (lines[footer]?.trim().startsWith(DETAIL_FOOTER)) return { kind: 'detail', agentLabel: AGENT_TITLE.exec(title)?.[1] ?? null };
  return title === LIST_TITLE ? { kind: 'list', rows: parseRows(body) } : null;
}

export function selectedIndex(screen: TasksScreen): number {
  return screen.kind === 'list' ? screen.rows.findIndex((row: TaskRow) => row.isSelected) : -1;
}

function isDialogFooter(line: string): boolean {
  const text: string = line.trim();
  return text.startsWith(LIST_FOOTER) || text.startsWith(DETAIL_FOOTER);
}

// The dialog sits under a plain rule; the agent strip's own footer has no dialog title between them.
function lastRuleBefore(lines: readonly string[], end: number): number {
  for (let index: number = end - 1; index >= 0; index--) {
    if (RULE.test(lines[index]?.trim() ?? '')) return index;
  }
  return -1;
}

function parseRows(body: readonly string[]): TaskRow[] {
  const rows: TaskRow[] = [];
  let section: string | null = null;
  for (const line of body) {
    if (SECTION.test(line.trim())) section = line.trim();
    const match: RegExpExecArray | null = section === null ? null : ROW.exec(line);
    if (match === null || section === null) continue;
    rows.push({ label: match[2] ?? '', isAgent: AGENT_SECTION.test(section), isSelected: match[1] === CURSOR });
  }
  return rows;
}

function findLastIndex(lines: readonly string[], test: (line: string) => boolean): number {
  for (let index: number = lines.length - 1; index >= 0; index--) {
    if (test(lines[index] ?? '')) return index;
  }
  return -1;
}
