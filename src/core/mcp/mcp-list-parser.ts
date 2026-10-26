import type { McpGroup, McpServerEntry, McpStatus } from '../../shared/types';

// Where each server is configured, so the list can be grouped like Claude Code's own /mcp.
export interface McpScopes {
  readonly user: ReadonlySet<string>;
  readonly local: ReadonlySet<string>;
  readonly project: ReadonlySet<string>;
}

const LINE_PATTERN: RegExp = /^(.+?): (.+) - (✔|!|✗|✘|×)\s*(.*)$/u;
const CLAUDE_AI_PREFIX: string = 'claude.ai ';
const PLUGIN_PREFIX: string = 'plugin:';

// One line of `claude mcp list`: "name: target - ✔ Connected". Lines that are not a server (headers) are skipped.
export function parseMcpList(output: string, scopes: McpScopes): McpServerEntry[] {
  return output.split('\n').flatMap((line: string): McpServerEntry[] => {
    const match: RegExpExecArray | null = LINE_PATTERN.exec(line.trim());
    if (match === null) return [];
    const [, name = '', target = '', mark = '', words = ''] = match;
    return [{ name, target: target.replace(/ \((HTTP|SSE)\)$/, ''), status: statusOf(mark, words), group: groupOf(name, scopes) }];
  });
}

function statusOf(mark: string, words: string): McpStatus {
  if (mark === '✔') return 'connected';
  return /authentication/i.test(words) ? 'needs-auth' : 'failed';
}

function groupOf(name: string, scopes: McpScopes): McpGroup {
  if (name.startsWith(CLAUDE_AI_PREFIX)) return 'claude-ai';
  if (name.startsWith(PLUGIN_PREFIX)) return 'plugin';
  if (scopes.project.has(name)) return 'project';
  if (scopes.local.has(name)) return 'local';
  return 'user';
}
