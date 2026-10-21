import type { PickerChoice } from '../../../shared/types';

// "❯ 2. [✔] Banana": the cursor (or a scroll arrow in a list cut to fit), the number, then the label.
const NUMBERED_ROW: RegExp = /^\s*(?:[❯↑↓]\s*)?(\d+)\.\s+(.*)$/;
const CHECKBOX: RegExp = /^\[(.)\]\s?(.*)$/;
const UNTICKED: string = ' ';
// A single-select marks the option picked on an earlier visit with a trailing check.
const EARLIER_PICK: RegExp = /\s+✔$/;
const CURSOR: RegExp = /^❯\s*/;
// The multi-select's own row under the "Type something" field: "Next" on earlier tabs, "Submit" on the last.
const MOVE_ON_ROWS: ReadonlySet<string> = new Set(['Submit', 'Next']);
const FIELD_PLACEHOLDERS: ReadonlySet<string> = new Set(['Type something.', 'Type something']);
// Options with previews are drawn beside a box; their rows cannot be counted the usual way.
const PREVIEW_BOX: RegExp = /[│┌└┐┘]/;

export interface QuestionBody {
  readonly question: string;
  readonly multiSelect: boolean;
  readonly options: readonly PickerChoice[];
  readonly other: string | null;
}

interface Row {
  readonly text: string;
  readonly details: string[];
}

// The lines between the tab bar and the separator above "Chat about this": the question, then numbered rows,
// the last of which is the "Type something" field.
export function parseQuestionBody(lines: readonly string[]): QuestionBody | null {
  const firstRow: number = lines.findIndex((line: string) => NUMBERED_ROW.test(line));
  if (firstRow === -1 || lines.some((line: string) => PREVIEW_BOX.test(line))) return null;
  const question: string = joinText(lines.slice(0, firstRow));
  const rows: Row[] | null = readRows(lines.slice(firstRow));
  if (question.length === 0 || rows === null || rows.length < 2) return null;
  const multiSelect: boolean = rows.every((row: Row) => CHECKBOX.test(row.text));
  const field: Row = rows[rows.length - 1] as Row;
  return { question, multiSelect, options: rows.slice(0, -1).map((row: Row) => toChoice(row, multiSelect)), other: fieldText(field, multiSelect) };
}

// Rows must count 1, 2, 3… in order; anything else is a layout this parser does not know.
function readRows(lines: readonly string[]): Row[] | null {
  const rows: Row[] = [];
  for (const line of lines) {
    const match: RegExpExecArray | null = NUMBERED_ROW.exec(line);
    if (match !== null) {
      if (Number(match[1]) !== rows.length + 1) return null;
      rows.push({ text: (match[2] ?? '').trim(), details: [] });
    } else if (line.trim().length > 0) {
      rows.at(-1)?.details.push(line.trim().replace(CURSOR, ''));
    }
  }
  const field: Row | undefined = rows.at(-1);
  if (field !== undefined && MOVE_ON_ROWS.has(field.details.at(-1) ?? '')) field.details.pop();
  return rows;
}

function toChoice(row: Row, multiSelect: boolean): PickerChoice {
  const box: RegExpExecArray | null = multiSelect ? CHECKBOX.exec(row.text) : null;
  const label: string = box === null ? row.text.replace(EARLIER_PICK, '') : (box[2] ?? '');
  return { label: label.trim(), description: joinText(row.details), ticked: box !== null && box[1] !== UNTICKED };
}

function fieldText(row: Row, multiSelect: boolean): string | null {
  const box: RegExpExecArray | null = multiSelect ? CHECKBOX.exec(row.text) : null;
  const text: string = [box === null ? row.text : (box[2] ?? ''), ...row.details].join(' ').trim();
  return text.length === 0 || FIELD_PLACEHOLDERS.has(text) ? null : text;
}

// The terminal wraps long text at word boundaries, so wrapped lines join back with a space.
function joinText(lines: readonly string[]): string {
  return lines.map((line: string) => line.trim()).filter((line: string) => line.length > 0).join(' ');
}
