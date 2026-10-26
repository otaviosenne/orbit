import { describe, expect, it } from 'vitest';
import { parseMcpList } from '../src/core/mcp/mcp-list-parser';
import type { McpScopes } from '../src/core/mcp/mcp-list-parser';

const SCOPES: McpScopes = { user: new Set(['browsermcp']), local: new Set(), project: new Set(['devhub']) };

const OUTPUT: string = [
  'Checking MCP server health…',
  '',
  'claude.ai Notion: https://mcp.notion.com/mcp - ! Needs authentication',
  'plugin:context7:context7: https://mcp.context7.com/mcp?client=claude-code-plugin (HTTP) - ! Needs authentication',
  'devhub: pnpm --silent --dir /HD/mudbord/.worktrees/devhub-mcp mcp - ✔ Connected',
  'playwright: npx @playwright/mcp@latest - ⊘ Disabled for this project (re-enable via /mcp)',
  'figma: https://mcp.figma.com/mcp (HTTP) - ⏸ Pending approval (run `claude` to approve)',
  'zapzap: node /x/server.js - ✘ Failed to connect',
  'odd: node /x/odd.js - ☂ Something new',
].join('\n');

describe('parseMcpList', () => {
  const entries = parseMcpList(OUTPUT, SCOPES);
  const statusOf = (name: string): string | undefined => entries.find((entry) => entry.name === name)?.status;

  it('lists every server line and skips the header', () => {
    expect(entries.map((entry) => entry.name)).toEqual(['claude.ai Notion', 'plugin:context7:context7', 'devhub', 'playwright', 'figma', 'zapzap', 'odd']);
  });

  it('reads each status, including the ones that are not connected or failed', () => {
    expect(['claude.ai Notion', 'devhub', 'playwright', 'figma', 'zapzap'].map(statusOf)).toEqual(['needs-auth', 'connected', 'disabled', 'needs-approval', 'failed']);
  });

  it('keeps a server with a mark it does not know as not connected instead of dropping it', () => {
    expect(statusOf('odd')).toBe('failed');
  });

  it('groups by where the server is configured', () => {
    expect(entries.map((entry) => entry.group)).toEqual(['claude-ai', 'plugin', 'project', 'user', 'user', 'user', 'user']);
  });

  it('drops the transport suffix from the target', () => {
    expect(entries.find((entry) => entry.name === 'plugin:context7:context7')?.target).toBe('https://mcp.context7.com/mcp?client=claude-code-plugin');
  });
});
