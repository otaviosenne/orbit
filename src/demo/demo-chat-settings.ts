import type { ChatPermissions, ChatSettings, McpServerEntry, SkillEntry } from '../shared/types';

// Every demo chat runs on the same model; the settings popover only needs something believable to show.
const DEMO_SETTINGS: ChatSettings = { model: 'claude-opus-5-5', effort: 'high' };

// Matches how the real chats run; demo actions change nothing, so switching just reports success.
const DEMO_PERMISSIONS: ChatPermissions = { mode: 'bypassPermissions', lockedReason: null };

const DEMO_SKILLS: readonly SkillEntry[] = [
  { name: 'code-review', description: 'Review the current diff for correctness bugs and simplifications', source: 'user' },
  { name: 'deploy', description: 'Build, tag and ship the current branch to staging', source: 'project' },
  { name: 'superpowers:brainstorming', description: 'Explore an idea before writing any code', source: 'plugin' },
  { name: 'superpowers:systematic-debugging', description: 'Find the root cause of a bug before proposing fixes', source: 'plugin' },
];

export function demoChatSettings(): ChatSettings {
  return DEMO_SETTINGS;
}

export function demoSkills(): SkillEntry[] {
  return [...DEMO_SKILLS];
}

export function demoChatPermissions(): ChatPermissions {
  return DEMO_PERMISSIONS;
}

export function demoMcpServers(): McpServerEntry[] {
  return [
    { name: 'devhub', target: 'pnpm --silent mcp', status: 'connected', group: 'user' },
    { name: 'posthog', target: 'https://mcp.posthog.com/mcp', status: 'connected', group: 'user' },
    { name: 'desktop-mcp', target: 'node desktop-mcp', status: 'failed', group: 'local' },
    { name: 'claude.ai Slack', target: 'https://mcp.slack.com/mcp', status: 'connected', group: 'claude-ai' },
    { name: 'claude.ai Linear', target: 'https://mcp.linear.app/mcp', status: 'needs-auth', group: 'claude-ai' },
    { name: 'plugin:context7:context7', target: 'https://mcp.context7.com/mcp', status: 'needs-auth', group: 'plugin' },
  ];
}
