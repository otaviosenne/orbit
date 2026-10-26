import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { McpScopes } from './mcp-list-parser';

interface ClaudeJson {
  readonly mcpServers?: Readonly<Record<string, unknown>>;
  readonly projects?: Readonly<Record<string, { readonly mcpServers?: Readonly<Record<string, unknown>> }>>;
}

interface ProjectMcpFile {
  readonly mcpServers?: Readonly<Record<string, unknown>>;
}

// Reads the names only, from the files Claude Code itself keeps: ~/.claude.json (user and per-folder "local") and the
// folder's .mcp.json (project, shared with the team).
export async function readMcpScopes(cwd: string): Promise<McpScopes> {
  const [claude, project]: [ClaudeJson | null, ProjectMcpFile | null] = await Promise.all([
    readJson<ClaudeJson>(join(homedir(), '.claude.json')),
    readJson<ProjectMcpFile>(join(cwd, '.mcp.json')),
  ]);
  return {
    user: namesOf(claude?.mcpServers),
    local: namesOf(claude?.projects?.[cwd]?.mcpServers),
    project: namesOf(project?.mcpServers),
  };
}

function namesOf(servers: Readonly<Record<string, unknown>> | undefined): Set<string> {
  return new Set(Object.keys(servers ?? {}));
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}
