import type WebSocket from 'ws';
import type { DictationReply } from '../../../shared/dictation-protocol';
import { CLOSE_POLICY_VIOLATION } from './close-codes';
import { DictationClient } from './dictation-client';
import type { DictationEngine } from './dictation-engine';
import type { DictationLimits } from './dictation-limits';
import { startHeartbeat } from './heartbeat';

export interface ConnectionHooks {
  readonly isAuthorized: () => boolean;
  readonly onEnded: (connection: DictationConnection) => void;
}

// Ties one accepted WebSocket to its DictationClient: messages in (each re-checked against the current sign-in),
// replies out, heartbeat, and a single ending however the socket goes.
export class DictationConnection {
  private readonly client: DictationClient;
  private readonly stopHeartbeat: () => void;
  private hasEnded: boolean = false;

  constructor(private readonly socket: WebSocket, engine: DictationEngine, limits: DictationLimits, private readonly hooks: ConnectionHooks) {
    this.client = new DictationClient(
      engine,
      {
        send: (reply: DictationReply): void => socket.send(JSON.stringify(reply)),
        close: (code: number, reason: string): void => socket.close(code, reason),
      },
      limits,
    );
    this.stopHeartbeat = startHeartbeat(socket, limits.heartbeatMs);
    socket.on('message', (data: WebSocket.RawData, isBinary: boolean): void => this.receive(data, isBinary));
    socket.on('close', (): void => this.end());
    socket.on('error', (): void => socket.terminate());
  }

  // Orbit Web is stopping or its credentials changed: drop the socket now, without waiting for the browser.
  terminate(): void {
    this.socket.terminate();
    this.end();
  }

  private receive(data: WebSocket.RawData, isBinary: boolean): void {
    if (!this.hooks.isAuthorized()) {
      this.socket.close(CLOSE_POLICY_VIOLATION, 'Signed out');
      return this.end();
    }
    if (isBinary) this.client.receiveAudio(toBytes(data));
    else this.client.receiveText(toBytes(data).toString());
  }

  private end(): void {
    if (this.hasEnded) return;
    this.hasEnded = true;
    this.stopHeartbeat();
    this.client.closed();
    this.hooks.onEnded(this);
  }
}

function toBytes(data: WebSocket.RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  return Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
}
