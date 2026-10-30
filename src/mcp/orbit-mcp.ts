import { APPROVAL_TOOL, APPROVAL_TOOL_NAME, requestApproval } from './approval-tool';
import type { RpcRequest } from './json-rpc';
import { METHOD_NOT_FOUND, RpcError, serveRpc } from './json-rpc';

// Orbit's MCP server: the tools a Claude Code chat calls to reach Orbit. Registered at user scope as "orbit",
// started by each chat as `node dist/orbit-mcp.js`, so its parent process is the chat itself.
const SERVER_INFO = { name: 'orbit', version: '1.0.0' } as const;
const FALLBACK_PROTOCOL: string = '2025-06-18';

async function handle(request: RpcRequest): Promise<unknown> {
  switch (request.method) {
    case 'initialize':
      return { protocolVersion: request.params?.['protocolVersion'] ?? FALLBACK_PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER_INFO };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: [APPROVAL_TOOL] };
    case 'tools/call':
      return callTool(request.params ?? {});
    default:
      if (request.method.startsWith('notifications/')) return null;
      throw new RpcError(METHOD_NOT_FOUND, `Unknown method ${request.method}`);
  }
}

function callTool(params: Record<string, unknown>): Promise<unknown> {
  if (params['name'] !== APPROVAL_TOOL_NAME) throw new RpcError(METHOD_NOT_FOUND, `Unknown tool ${String(params['name'])}`);
  const args: unknown = params['arguments'];
  return requestApproval(typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {}, process.ppid);
}

serveRpc(handle, (): void => process.exit(0));
