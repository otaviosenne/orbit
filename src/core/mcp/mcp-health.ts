import { execFile } from 'node:child_process';
import type { McpServerEntry } from '../../shared/types';
import { parseMcpList } from './mcp-list-parser';
import { readMcpScopes } from './mcp-scopes';

// `claude mcp list` starts every stdio server to check it, which can take a while.
const LIST_TIMEOUT_MS: number = 60_000;
// Opening the section twice in a row must not start every server twice.
const CACHE_MS: number = 20_000;
const MAX_OUTPUT_BYTES: number = 1_000_000;

interface CachedList {
  readonly at: number;
  readonly entries: Promise<McpServerEntry[]>;
}

const cache: Map<string, CachedList> = new Map();

// The servers a chat started in this folder can see, with whether each is connected. Run from the chat's folder, since
// local and project servers depend on it.
export function listMcpServers(cwd: string, now: number): Promise<McpServerEntry[]> {
  const cached: CachedList | undefined = cache.get(cwd);
  if (cached !== undefined && now - cached.at < CACHE_MS) return cached.entries;
  const entries: Promise<McpServerEntry[]> = load(cwd);
  cache.set(cwd, { at: now, entries });
  entries.catch((): void => void cache.delete(cwd));
  return entries;
}

async function load(cwd: string): Promise<McpServerEntry[]> {
  const [output, scopes] = await Promise.all([run(cwd), readMcpScopes(cwd)]);
  return parseMcpList(output, scopes);
}

function run(cwd: string): Promise<string> {
  return new Promise((resolve, reject): void => {
    execFile('claude', ['mcp', 'list'], { cwd, timeout: LIST_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES }, (error, stdout: string): void => {
      if (error !== null && stdout.length === 0) reject(error);
      else resolve(stdout);
    });
  });
}
