import { STATUS_CODES } from 'node:http';
import type { Duplex } from 'node:stream';
import type { UpgradeRefusal } from './upgrade-checks';

// A refused handshake gets a plain HTTP answer on the raw socket, which is then closed.
export function refuseUpgrade(socket: Duplex, refusal: UpgradeRefusal): void {
  const body: string = JSON.stringify({ error: refusal.message });
  socket.end(
    [
      `HTTP/1.1 ${refusal.status} ${STATUS_CODES[refusal.status] ?? ''}`,
      'Connection: close',
      'Cache-Control: no-store',
      'Content-Type: application/json; charset=utf-8',
      `Content-Length: ${Buffer.byteLength(body)}`,
      '',
      body,
    ].join('\r\n'),
  );
}
