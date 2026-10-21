import type { IncomingMessage } from 'node:http';
import { requestPath } from './request-handler';

// Method, path, status and time only: never the query string, headers or body, where a token could hide.
export function logLine(request: IncomingMessage, status: number, elapsedMs: number): string {
  return `[orbit-web] ${new Date().toISOString()} ${request.method ?? '?'} ${requestPath(request)} ${status} ${elapsedMs}ms`;
}
