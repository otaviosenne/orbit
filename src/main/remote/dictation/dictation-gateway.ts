import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import { DICTATION_SOCKET_PATH } from '../../../shared/dictation-protocol';
import type { RemoteContext } from '../remote-context';
import { logLine } from '../request-log';
import { ClientRegistry } from './client-registry';
import { DictationConnection } from './dictation-connection';
import type { DictationLimits } from './dictation-limits';
import { DICTATION_LIMITS } from './dictation-limits';
import { refuseUpgrade } from './refuse-upgrade';
import type { UpgradeRefusal } from './upgrade-checks';
import { stillAuthorized, upgradeRefusal } from './upgrade-checks';

type GatewayContext = Pick<RemoteContext, 'credentials' | 'dictation' | 'now' | 'log'>;

const SWITCHING_PROTOCOLS: number = 101;

// Orbit Web's dictation socket (GET /api/dictation, upgraded to a WebSocket): checks the handshake like any API call,
// gives each admitted browser its own engine, and hangs up on all of them when Orbit Web stops.
export class DictationGateway {
  private readonly sockets: WebSocketServer;
  private readonly connections: ClientRegistry<DictationConnection>;

  constructor(private readonly context: GatewayContext, private readonly limits: DictationLimits = DICTATION_LIMITS) {
    // No compression: PCM barely shrinks, and inflating client data is memory the cap would not see.
    this.sockets = new WebSocketServer({ noServer: true, maxPayload: limits.maxMessageBytes, perMessageDeflate: false, clientTracking: false });
    this.connections = new ClientRegistry(limits.maxClients);
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    const startedAt: number = this.context.now();
    const refusal: UpgradeRefusal | null = upgradeRefusal(request, this.context.credentials(), this.connections.hasRoom);
    if (refusal !== null) {
      refuseUpgrade(socket, refusal);
      return this.context.log(logLine(request, refusal.status, this.context.now() - startedAt));
    }
    this.sockets.handleUpgrade(request, socket, head, (accepted: WebSocket): void => {
      this.context.log(logLine(request, SWITCHING_PROTOCOLS, this.context.now() - startedAt));
      this.accept(accepted, request);
    });
  }

  closeAll(): void {
    for (const connection of this.connections.drain()) connection.terminate();
  }

  private accept(socket: WebSocket, request: IncomingMessage): void {
    const connection: DictationConnection = new DictationConnection(socket, this.context.dictation(), this.limits, {
      isAuthorized: stillAuthorized(request, this.context.credentials),
      onEnded: (ended: DictationConnection): void => {
        this.connections.remove(ended);
        this.context.log(`[orbit-web] ${new Date().toISOString()} ${DICTATION_SOCKET_PATH} closed`);
      },
    });
    // Another browser may have taken the last slot while this handshake completed.
    if (!this.connections.admit(connection)) connection.terminate();
  }
}
