import { isShowingAgent } from './agent-panel';

// The prompt box ends on a rule; its first line starts with the caret.
const RULE: RegExp = /^─{3,}/;
const PROMPT_CARET: string = '❯';
// Footer hints shown while the keyboard is on the agent list or the shells pill instead of the prompt.
const SELECTOR_HINTS: readonly string[] = ['to select', 'Enter to view'];

const SHOWING_AGENT: string = "The chat's window is showing an agent; switch it back to main first";
const MULTI_LINE_DRAFT: string = "The chat's window has a multi-line draft in its prompt; send or clear it first";
const SELECTOR_FOCUSED: string = "The chat's window has its agent list focused; click its prompt first";
const NO_PROMPT: string = "The chat's prompt is not on screen; check its window";

interface PromptBox {
  readonly lines: readonly string[];
  readonly footer: string;
}

// Why /tasks cannot be typed safely right now, or null when it can: Ctrl+U clears only the draft's last line,
// so the rest would be sent along with /tasks, and keys typed into the agent list would open an agent instead.
export function terminalBlocker(screen: string): string | null {
  if (isShowingAgent(screen)) return SHOWING_AGENT;
  const box: PromptBox | null = lastPromptBox(screen.split('\n').map((line: string) => line.trimEnd()));
  // Something else owns the screen (a dialog or prompt Orbit does not know), so nothing is typed blind.
  if (box === null) return NO_PROMPT;
  if (box.lines.length > 1) return MULTI_LINE_DRAFT;
  return SELECTOR_HINTS.some((hint: string) => box.footer.includes(hint)) ? SELECTOR_FOCUSED : null;
}

// Anchored on the box's lower rule, the screen's last one: on a short window the upper rule may be scrolled away.
function lastPromptBox(lines: readonly string[]): PromptBox | null {
  const bottom: number = findLastIndex(lines, isRule);
  for (let index: number = bottom - 1; index >= 0 && !isRule(lines[index]); index--) {
    if ((lines[index] ?? '').startsWith(PROMPT_CARET)) return { lines: lines.slice(index, bottom), footer: lines[bottom + 1] ?? '' };
  }
  return null;
}

function findLastIndex(lines: readonly string[], test: (line: string) => boolean): number {
  for (let index: number = lines.length - 1; index >= 0; index--) {
    if (test(lines[index] ?? '')) return index;
  }
  return -1;
}

function isRule(line: string | undefined): boolean {
  return RULE.test(line ?? '');
}
