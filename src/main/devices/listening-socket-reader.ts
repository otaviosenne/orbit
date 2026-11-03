import type { ListeningSocket } from '../../core/devices/listening-sockets';
import { parseListeningSockets } from '../../core/devices/listening-sockets';
import { runCommand } from '../run-command';

// ss is a process spawn and every card asks on each poll; servers rarely come and go faster.
const SOCKETS_TTL_MS: number = 3000;

// The machine's listening TCP sockets with their processes, read at most once per TTL for every chat asking.
export class ListeningSocketReader {
  private cached: { readonly at: number; readonly sockets: Promise<ListeningSocket[]> } | null = null;

  sockets(): Promise<ListeningSocket[]> {
    const now: number = Date.now();
    if (this.cached !== null && now - this.cached.at < SOCKETS_TTL_MS) return this.cached.sockets;
    const sockets: Promise<ListeningSocket[]> = runCommand('ss', ['-ltnpH'])
      .then(parseListeningSockets)
      .catch((): ListeningSocket[] => []);
    this.cached = { at: now, sockets };
    return sockets;
  }
}
