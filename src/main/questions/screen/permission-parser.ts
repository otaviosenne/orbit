import type { PermissionOption, PickerPermissionView } from '../../../shared/types';
import { squeeze } from './picker-evidence';

// The permission prompt ends with "Esc to cancel · Tab to amend"; the question picker's footer starts with "Enter to
// select", so the two never match each other. Wrapped lines are compared with whitespace removed.
const FOOTER_START: string = 'Esctocancel';
const OPTION_ROW: RegExp = /^\s*(?:❯\s*)?(\d+)\.\s+(.*?)\s*$/;
const QUESTION_ROW: RegExp = /^\s*(.*\?)\s*$/;
// The solid rule opens the prompt; dashed rules fence the command or the edit.
const SOLID_RULE: RegExp = /^─{8,}$/;
const DASHED_RULE: RegExp = /^╌{8,}$/;
const WARNING_ROW: RegExp = /^\s*│\s?(.*)$/;
const NOTICE_ROW: RegExp = /^\s*⚠\s*(.*)$/;
// "will automatically block this request in 1:36": the countdown is stale by the time anyone reads it in Orbit.
const COUNTDOWN: RegExp = / in \d+:\d{2}(?=,)/;
// The question picker's last row; a prompt that has it is AskUserQuestion, not a permission.
const CHAT_ABOUT_THIS: string = 'Chat about this';
const FIRST_OPTION: number = 1;
const MIN_OPTIONS: number = 2;
// Claude Code indents the prompt's text by one space; a row indented deeper is the previous row wrapped by a narrow
// window.
const PROMPT_INDENT: RegExp = /^ /;
const WRAPPED_ROW: RegExp = /^ {2,}\S/;
// A narrow window draws the command behind a "│" gutter instead of plain.
const COMMAND_GUTTER: RegExp = /^\s*│ ?/;

// Reads Claude Code's tool permission prompt off a plain `kitty @ get-text` capture; null when none is showing.
export function parsePermission(screen: string): PickerPermissionView | null {
  const lines: string[] = screen.split('\n').map((line: string) => line.trimEnd());
  const footer: number = lastIndex(lines, lines.length, (line: string) => squeeze(line).startsWith(FOOTER_START));
  if (footer === -1) return null;
  const question: number = questionRow(lines, footer);
  if (question === -1) return null;
  const options: PermissionOption[] = readOptions(lines.slice(question + 1, footer));
  if (options.length < MIN_OPTIONS || options[0]?.number !== FIRST_OPTION) return null;
  if (options.some((option: PermissionOption) => option.label === CHAT_ABOUT_THIS)) return null;
  const top: number = lastIndex(lines, question, (line: string) => SOLID_RULE.test(line.trim()));
  const head: PromptHead = readHead(lines.slice(top + 1, question), top !== -1);
  const questionText: string = (QUESTION_ROW.exec(lines[question] ?? '')?.[1] ?? '').trim();
  // Squeezed, so the same prompt keeps its fingerprint when the window rewraps it: answering shrinks the font first.
  const fingerprint: string = ['permission', head.detail ?? '', questionText, ...options.map((option: PermissionOption) => option.label)].map(squeeze).join('\n');
  return { kind: 'permission', fingerprint, ...head, question: questionText, options };
}

// The question sits right above the first option, blank lines aside. The option is searched up from the footer: the
// history above the prompt can hold a numbered list of the chat's own, whose "1." is not the prompt's.
function questionRow(lines: readonly string[], footer: number): number {
  const firstOption: number = lastIndex(lines, footer, (line: string) => OPTION_ROW.exec(line)?.[1] === String(FIRST_OPTION));
  if (firstOption === -1) return -1;
  for (let index: number = firstOption - 1; index >= 0; index--) {
    const line: string = lines[index] ?? '';
    if (line.trim().length === 0) continue;
    return QUESTION_ROW.test(line) ? index : -1;
  }
  return -1;
}

// A long option wraps: its next lines have no number and join it.
function readOptions(rows: readonly string[]): PermissionOption[] {
  const options: PermissionOption[] = [];
  for (const row of rows) {
    const match: RegExpExecArray | null = OPTION_ROW.exec(row);
    const last: PermissionOption | undefined = options[options.length - 1];
    if (match !== null) options.push({ number: Number(match[1]), label: match[2] ?? '' });
    else if (last !== undefined && row.trim().length > 0) options[options.length - 1] = { ...last, label: `${last.label} ${row.trim()}` };
  }
  return options;
}

interface PromptHead {
  readonly title: string | null;
  readonly description: string | null;
  readonly detail: string | null;
  readonly warnings: readonly string[];
}

// Title and description, then the command between dashed rules, then the warnings. With the top scrolled away only
// what is left of it is read, and the title is unknown.
function readHead(body: readonly string[], hasTop: boolean): PromptHead {
  const fences: number[] = body.flatMap((line: string, index: number) => (DASHED_RULE.test(line.trim()) ? [index] : []));
  // Scrolled so far that only the closing fence shows: what is above it is the end of the command.
  const isOpenCut: boolean = !hasTop && fences.length === 1;
  const open: number | undefined = isOpenCut ? -1 : fences[0];
  const close: number | undefined = isOpenCut ? fences[0] : fences[1];
  const intro: string[] = nonBlank(joinWrapped(open === undefined ? (hasTop ? body : []) : body.slice(0, Math.max(open, 0))));
  const detailLines: string[] = withoutGutter(open === undefined ? [] : body.slice(open + 1, close ?? body.length).map((line: string) => line.replace(PROMPT_INDENT, '')));
  const after: readonly string[] = close === undefined ? (open === undefined && !hasTop ? body : []) : body.slice(close + 1);
  return {
    title: hasTop ? (intro[0] ?? null) : null,
    description: intro.length > 1 ? intro.slice(1).join(' ') : null,
    detail: trimBlankEdges(detailLines).join('\n') || null,
    warnings: readWarnings(after),
  };
}

// "│" lines are one warning wrapped over several rows; a "⚠" notice runs on over the plain rows after it.
function readWarnings(rows: readonly string[]): string[] {
  const warnings: string[] = [];
  let kind: 'warning' | 'notice' | null = null;
  for (const row of rows) {
    const warning: RegExpExecArray | null = WARNING_ROW.exec(row);
    const notice: RegExpExecArray | null = NOTICE_ROW.exec(row);
    const text: string = (warning?.[1] ?? notice?.[1] ?? row).trim();
    if (text.length === 0) {
      kind = null;
      continue;
    }
    const rowKind: 'warning' | 'notice' | null = warning !== null ? 'warning' : notice !== null ? 'notice' : kind;
    const continues: boolean = rowKind !== null && rowKind === kind && notice === null;
    if (continues) warnings[warnings.length - 1] = `${warnings[warnings.length - 1] ?? ''} ${text}`;
    else warnings.push(text);
    kind = rowKind ?? 'notice';
  }
  return warnings.map((warning: string) => warning.replace(COUNTDOWN, ''));
}

function joinWrapped(rows: readonly string[]): string[] {
  const joined: string[] = [];
  for (const row of rows) {
    const last: number = joined.length - 1;
    if (last >= 0 && (joined[last] ?? '').trim().length > 0 && WRAPPED_ROW.test(row)) joined[last] = `${joined[last] ?? ''} ${row.trim()}`;
    else joined.push(row);
  }
  return joined;
}

function withoutGutter(lines: readonly string[]): string[] {
  const filled: readonly string[] = lines.filter((line: string) => line.trim().length > 0);
  const hasGutter: boolean = filled.length > 0 && filled.every((line: string) => COMMAND_GUTTER.test(line));
  return hasGutter ? lines.map((line: string) => line.replace(COMMAND_GUTTER, '')) : [...lines];
}

function nonBlank(lines: readonly string[]): string[] {
  return lines.map((line: string) => line.trim()).filter((line: string) => line.length > 0);
}

function trimBlankEdges(lines: readonly string[]): string[] {
  let start: number = 0;
  let end: number = lines.length;
  while (start < end && (lines[start] ?? '').trim().length === 0) start++;
  while (end > start && (lines[end - 1] ?? '').trim().length === 0) end--;
  return lines.slice(start, end);
}

function lastIndex(lines: readonly string[], before: number, matches: (line: string) => boolean): number {
  for (let index: number = before - 1; index >= 0; index--) if (matches(lines[index] ?? '')) return index;
  return -1;
}
