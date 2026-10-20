import { clipText, firstLine } from './clip-text';
import { MAX_TOOL_TEXT_CHARS } from './config';

export type ToolInput = Readonly<Record<string, unknown>>;

const SUMMARY_CHARS: number = 140;
const MCP_PREFIX: string = 'mcp__';
const JSON_INDENT: number = 2;

// Which input field best says what each tool call was about.
const SUMMARY_FIELDS: Readonly<Record<string, readonly string[]>> = {
  Bash: ['description', 'command'],
  Read: ['file_path'],
  Edit: ['file_path'],
  Write: ['file_path'],
  NotebookEdit: ['notebook_path'],
  Grep: ['pattern'],
  Glob: ['pattern'],
  Agent: ['description'],
  WebFetch: ['url'],
  WebSearch: ['query'],
  Skill: ['skill'],
  ToolSearch: ['query'],
};

// "mcp__github__create_issue" reads better as "github · create_issue".
export function displayToolName(name: string): string {
  if (!name.startsWith(MCP_PREFIX)) return name;
  return name.slice(MCP_PREFIX.length).split('__').join(' · ');
}

export function summarizeTool(name: string, input: ToolInput): string {
  const fields: readonly string[] = SUMMARY_FIELDS[name] ?? [];
  const preferred: unknown = fields.map((field: string) => input[field]).find((value: unknown) => typeof value === 'string');
  const fallback: unknown = Object.values(input).find((value: unknown) => typeof value === 'string');
  return firstLine(String(preferred ?? fallback ?? ''), SUMMARY_CHARS);
}

// The shell command is the whole story for Bash; other tools show their arguments.
export function describeToolInput(name: string, input: ToolInput): string {
  const text: string = name === 'Bash' && typeof input['command'] === 'string' ? input['command'] : JSON.stringify(input, null, JSON_INDENT);
  return clipText(text, MAX_TOOL_TEXT_CHARS);
}
