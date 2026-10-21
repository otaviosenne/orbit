import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { sendError } from './http-io';
import type { RemoteContext } from './remote-context';
import { handleRequest, requestPath } from './request-handler';

// Never 0.0.0.0: reaching Orbit Web from elsewhere goes through a tunnel or proxy the user set up on purpose.
export const LOOPBACK_HOST: string = '127.0.0.1';

export function createRemoteServer(context: RemoteContext): Server {
  return createServer((request: IncomingMessage, response: ServerResponse): void => {
    const startedAt: number = context.now();
    response.on('finish', (): void => context.log(logLine(request, response.statusCode, context.now() - startedAt)));
    handleRequest(request, response, context).catch((error: unknown): void => {
      context.log(`[orbit-web] handler failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent) sendError(response, 500, 'Internal error');
      else response.destroy();
    });
  });
}

// Method, path, status and time only: never the query string, headers or body, where a token could hide.
export function logLine(request: IncomingMessage, status: number, elapsedMs: number): string {
  return `[orbit-web] ${new Date().toISOString()} ${request.method ?? '?'} ${requestPath(request)} ${status} ${elapsedMs}ms`;
}

// Resolves with the port really bound, so port 0 (tests) reports the one the system picked.
export function listenLocally(server: Server, port: number): Promise<number> {
  return new Promise((resolve: (port: number) => void, reject: (error: Error) => void): void => {
    server.once('error', reject);
    server.listen(port, LOOPBACK_HOST, (): void => {
      server.off('error', reject);
      resolve((server.address() as AddressInfo).port);
    });
  });
}

export function closeServer(server: Server): Promise<void> {
  return new Promise((resolve: () => void): void => {
    server.close((): void => resolve());
    server.closeAllConnections();
  });
}
