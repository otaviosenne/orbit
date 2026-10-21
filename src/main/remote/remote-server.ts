import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { DictationGateway } from './dictation/dictation-gateway';
import { sendError } from './http-io';
import type { RemoteContext } from './remote-context';
import { handleRequest } from './request-handler';
import { logLine } from './request-log';

// Never 0.0.0.0: reaching Orbit Web from elsewhere goes through a tunnel or proxy the user set up on purpose.
export const LOOPBACK_HOST: string = '127.0.0.1';

// Upgraded sockets leave the HTTP server's own bookkeeping, so each server keeps its dictation gateway at hand to
// hang up on them; otherwise closing the server would wait for every phone to leave.
const gateways: WeakMap<Server, DictationGateway> = new WeakMap();

export function createRemoteServer(context: RemoteContext): Server {
  const server: Server = createServer((request: IncomingMessage, response: ServerResponse): void => {
    const startedAt: number = context.now();
    response.on('finish', (): void => context.log(logLine(request, response.statusCode, context.now() - startedAt)));
    handleRequest(request, response, context).catch((error: unknown): void => {
      context.log(`[orbit-web] handler failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent) sendError(response, 500, 'Internal error');
      else response.destroy();
    });
  });
  const gateway: DictationGateway = new DictationGateway(context);
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer): void => gateway.handleUpgrade(request, socket, head));
  gateways.set(server, gateway);
  return server;
}

// Every browser dictating through this server is cut off at once, as when its token changes.
export function dropDictationClients(server: Server): void {
  gateways.get(server)?.closeAll();
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
    dropDictationClients(server);
    server.close((): void => resolve());
    server.closeAllConnections();
  });
}
