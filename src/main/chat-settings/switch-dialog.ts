import type { SwitchConfirmation } from '../../shared/types';

// Claude Code asks before a /model or /effort change makes the next reply re-read a cached conversation.
const DIALOG_TITLES: readonly string[] = ['Switch model?', 'Change effort level?'];
const FIRST_OPTION: RegExp = /^(?:❯\s*)?1\.\s+(.+)$/;

// The dialog on screen, read from the chat's terminal text; null when there is none.
export function parseSwitchDialog(screen: string): SwitchConfirmation | null {
  const lines: string[] = screen.split('\n').map((line: string): string => line.trim());
  const titleAt: number = lines.findIndex((line: string): boolean => DIALOG_TITLES.includes(line));
  if (titleAt === -1) return null;
  const optionAt: number = lines.findIndex((line: string, index: number): boolean => index > titleAt && FIRST_OPTION.test(line));
  if (optionAt === -1) return null;
  return { title: lines[titleAt] ?? '', detail: paragraphs(lines.slice(titleAt + 1, optionAt)), confirmLabel: lines[optionAt]?.match(FIRST_OPTION)?.[1] ?? '' };
}

// The dialog's first line stands on its own; the explanation under it wraps over several lines of the terminal.
function paragraphs(lines: readonly string[]): string {
  const [lead = '', ...rest] = lines.filter((line: string): boolean => line.length > 0);
  return [lead, rest.join(' ')].filter((text: string): boolean => text.length > 0).join('\n');
}
