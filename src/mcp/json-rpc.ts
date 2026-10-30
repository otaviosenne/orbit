import { createInterface } from 'node:readline';
import type { Interface } from 'node:readline';

// MCP over stdio: one JSON-RPC message per line. Stdout carries only these messages, so nothing else may print.
export interface RpcRequest {
  readonly id?: number | string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export type RpcHandler = (request: RpcRequest) => Promise<unknown>;

export class RpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

export const METHOD_NOT_FOUND: number = -32601;
const PARSE_ERROR: number = -32700;
const INTERNAL_ERROR: number = -32603;

// Answers each request as it arrives; notifications (no id) are handled but never answered. When the chat closes
// its end, the requests still running finish first, so a request it already sent is never half written.
export function serveRpc(handle: RpcHandler, onClose: () => void): void {
  const running: Set<Promise<void>> = new Set();
  const lines: Interface = createInterface({ input: process.stdin });
  lines.on('line', (line: string): void => {
    const reply: Promise<void> = answer(line, handle).finally((): boolean => running.delete(reply));
    running.add(reply);
  });
  lines.on('close', (): void => void Promise.allSettled([...running]).then(onClose));
}

async function answer(line: string, handle: RpcHandler): Promise<void> {
  if (line.trim().length === 0) return;
  let request: RpcRequest;
  try {
    request = JSON.parse(line) as RpcRequest;
  } catch {
    return send({ jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Invalid JSON' } });
  }
  try {
    const result: unknown = await handle(request);
    if (request.id !== undefined) send({ jsonrpc: '2.0', id: request.id, result });
  } catch (error: unknown) {
    const code: number = error instanceof RpcError ? error.code : INTERNAL_ERROR;
    if (request.id !== undefined) send({ jsonrpc: '2.0', id: request.id, error: { code, message: String(error instanceof Error ? error.message : error) } });
  }
}

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
