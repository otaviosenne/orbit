// Reads the reply Claude Code is still writing off a plain `kitty @ get-text --extent all` capture. The transcript gets
// a text block only once it is finished, while the terminal shows it growing; this is that growing text, as a draft.

const BULLET: string = '● ';
// The rule that opens the composer at the bottom of the screen, and the composer's own prompt row under it.
const RULE: RegExp = /^─{8,}/;
const PROMPT: string = '❯';
// Every line of a block after its bullet is indented by two spaces.
const BODY_INDENT: string = '  ';
// A tool's output hangs under its call behind this mark; a block that has it is a tool call, not text.
const TOOL_OUTPUT: string = '⎿';
// "Bash(npm test)", "Read(src/a.ts)": a tool call's first row.
const TOOL_CALL: RegExp = /^[A-Za-z][\w.:-]*\(/;
// Rows that keep their own line when the text is unwrapped: list items, headings, quotes, tables and code frames.
const OWN_LINE: RegExp = /^\s*(?:[-*•]\s|\d+[.)]\s|#|>|[│├└┌┐┘┤┬┴┼╭╮╯╰|])/;
const FIRST_WORD: RegExp = /^\S*/;

// The text of the reply being written, or null when the screen ends with something else (a tool, a prompt, no chat).
export function parseStreamingReply(screen: string): string | null {
  const lines: string[] = screen.split('\n').map((line: string) => line.trimEnd());
  const composer: number = composerTop(lines);
  if (composer === -1) return null;
  const bullet: number = lastBlockStart(lines, composer);
  if (bullet === -1) return null;
  const first: string = (lines[bullet] ?? '').slice(BULLET.length);
  if (TOOL_CALL.test(first)) return null;
  const body: string[] = trailingBlanksDropped(lines.slice(bullet + 1, composer)).filter(isBodyRow);
  if (body.some((line: string) => line.trimStart().startsWith(TOOL_OUTPUT))) return null;
  const width: number = (lines[composer] ?? '').length - BODY_INDENT.length;
  const text: string = unwrap([first, ...body.map((line: string) => line.slice(BODY_INDENT.length))], width).trim();
  return text.length === 0 ? null : text;
}

// The rule right above the last prompt row: the composer, with everything the chat printed above it.
function composerTop(lines: readonly string[]): number {
  for (let index: number = lines.length - 1; index > 0; index--) {
    if ((lines[index] ?? '').startsWith(PROMPT) && RULE.test(lines[index - 1] ?? '')) return index - 1;
  }
  return -1;
}

// Up from the composer over the block's indented rows to its bullet. A spinner or status row may sit right above the
// composer; anything else unindented between the block and the composer means the block is not the last thing shown.
function lastBlockStart(lines: readonly string[], composer: number): number {
  let seenBody: boolean = false;
  for (let index: number = composer - 1; index >= 0; index--) {
    const line: string = lines[index] ?? '';
    if (line.startsWith(BULLET)) return index;
    if (line.length === 0) continue;
    if (line.startsWith(BODY_INDENT)) {
      seenBody = true;
      continue;
    }
    if (seenBody) return -1;
  }
  return -1;
}

function isBodyRow(line: string): boolean {
  return line.length === 0 || line.startsWith(BODY_INDENT);
}

function trailingBlanksDropped(lines: readonly string[]): string[] {
  let end: number = lines.length;
  while (end > 0 && (lines[end - 1] ?? '').trim().length === 0) end--;
  return lines.slice(0, end);
}

// Joins the rows Claude Code wrapped to the window: a row continues the one above when its first word would not have
// fit there. Blank rows stay paragraph breaks.
function unwrap(rows: readonly string[], width: number): string {
  const out: string[] = [];
  let previousRow: string = '';
  for (const row of rows) {
    if (out.length > 0 && continuesRow(previousRow, row, width)) out[out.length - 1] = `${out[out.length - 1] ?? ''} ${row.trimStart()}`;
    else out.push(row);
    previousRow = row;
  }
  return out.join('\n');
}

function continuesRow(previousRow: string, row: string, width: number): boolean {
  if (previousRow.trim().length === 0 || row.trim().length === 0 || OWN_LINE.test(row)) return false;
  const firstWord: string = FIRST_WORD.exec(row.trimStart())?.[0] ?? '';
  return previousRow.length + 1 + firstWord.length > width;
}
