import type { McpGroup, McpServerEntry, McpStatus } from '../../../shared/types';
import { element } from '../../dom';
import { Disclosure } from './disclosure';

const LOADING_TEXT: string = 'Checking servers… this can take a few seconds';
const EMPTY_TEXT: string = 'No MCP servers';
const FAILED_TEXT: string = 'Could not check the servers. Close and open this panel to try again.';
const LOADING_VALUE: string = '…';

// Same order and names as Claude Code's own /mcp menu.
const GROUPS: readonly { readonly group: McpGroup; readonly title: string }[] = [
  { group: 'user', title: 'User MCPs' },
  { group: 'project', title: 'Project MCPs' },
  { group: 'local', title: 'Local MCPs' },
  { group: 'plugin', title: 'Plugin MCPs' },
  { group: 'claude-ai', title: 'claude.ai connectors' },
];

const STATUS_TEXT: Readonly<Record<McpStatus, string>> = {
  connected: 'Connected',
  'needs-auth': 'Needs authentication',
  failed: 'Not connected',
  disabled: 'Disabled',
  'needs-approval': 'Needs approval',
  dropped: 'Dropped in this chat',
  connecting: 'Connecting in this chat…',
};

// What the button does in Claude Code's /mcp menu; a server still connecting has nothing to press.
const ACTION_TEXT: Readonly<Record<McpStatus, string | null>> = {
  connected: null,
  'needs-auth': 'Connect',
  failed: 'Reconnect',
  disabled: 'Enable',
  'needs-approval': 'Approve',
  dropped: 'Reconnect',
  connecting: null,
};

export type McpConnect = () => void;

// The chat's MCP servers, grouped by where they are configured. Connecting happens in Claude Code's own /mcp menu,
// which the button opens in the chat.
export class McpSection {
  readonly disclosure: Disclosure;
  private readonly list: HTMLDivElement = element('div', 'chat-settings-mcp-list');
  private loadingFor: string | null = null;

  constructor(private readonly onConnect: McpConnect, toggle: () => void) {
    this.disclosure = new Disclosure('MCPs', toggle);
    this.disclosure.body.append(this.list);
  }

  // Read on every open: a server that dropped since the last look belongs in the list as it is now.
  async load(sessionId: string): Promise<void> {
    this.loadingFor = sessionId;
    this.disclosure.setValue(LOADING_VALUE);
    this.list.replaceChildren(element('p', 'chat-settings-empty', LOADING_TEXT));
    const servers: McpServerEntry[] | null = await window.radar.listMcpServers(sessionId).catch((): null => null);
    if (this.loadingFor !== sessionId) return;
    if (servers === null) return this.showFailure();
    const down: number = servers.filter((server: McpServerEntry) => server.status !== 'connected').length;
    this.disclosure.setValue(down === 0 ? String(servers.length) : `${servers.length - down}/${servers.length}`);
    this.render(servers);
  }

  private showFailure(): void {
    this.disclosure.setValue('?');
    this.list.replaceChildren(element('p', 'chat-settings-empty', FAILED_TEXT));
  }

  private render(servers: readonly McpServerEntry[]): void {
    if (servers.length === 0) return void this.list.replaceChildren(element('p', 'chat-settings-empty', EMPTY_TEXT));
    this.list.replaceChildren(...GROUPS.flatMap(({ group, title }) => this.renderGroup(title, servers.filter((server: McpServerEntry) => server.group === group))));
  }

  private renderGroup(title: string, servers: readonly McpServerEntry[]): HTMLElement[] {
    if (servers.length === 0) return [];
    return [element('h4', 'chat-settings-mcp-group', title), ...servers.map((server: McpServerEntry) => this.renderServer(server))];
  }

  private renderServer(server: McpServerEntry): HTMLElement {
    const row: HTMLDivElement = element('div', `chat-settings-mcp is-${server.status}`);
    row.title = server.target;
    const text: HTMLDivElement = element('div', 'chat-settings-mcp-text');
    text.append(element('span', 'chat-settings-mcp-name', server.name.replace(/^claude\.ai /, '')), element('span', 'chat-settings-mcp-status', STATUS_TEXT[server.status]));
    row.append(element('span', 'chat-settings-mcp-dot'), text);
    const action: string | null = ACTION_TEXT[server.status];
    if (action !== null) {
      const connect: HTMLButtonElement = element('button', 'chat-settings-mcp-connect', action);
      connect.type = 'button';
      connect.addEventListener('click', this.onConnect);
      row.append(connect);
    }
    return row;
  }
}
