export type Outgoing = string | Uint8Array<ArrayBuffer>;

// About half a minute of 16 kHz audio: more than a slow handshake ever needs, small enough never to pile up.
const MAX_QUEUED_BYTES: number = 1024 * 1024;

// What was sent while the socket was still connecting, in order. Past the cap, audio is dropped (a few lost words)
// but control messages never are, or a start or finish would never be answered.
export class Outbox {
  private readonly queued: Outgoing[] = [];
  private queuedBytes: number = 0;

  push(message: Outgoing): void {
    const size: number = typeof message === 'string' ? message.length : message.byteLength;
    if (typeof message !== 'string' && this.queuedBytes + size > MAX_QUEUED_BYTES) return;
    this.queued.push(message);
    this.queuedBytes += size;
  }

  drain(): Outgoing[] {
    this.queuedBytes = 0;
    return this.queued.splice(0);
  }
}
