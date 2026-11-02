import { homedir } from 'node:os';
import type { ListeningSocket } from '../../core/devices/listening-sockets';
import { parseListeningSockets } from '../../core/devices/listening-sockets';
import { metroPortOf } from '../../core/devices/metro-port';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { runCommand } from '../run-command';
import { procFacts } from './proc-facts';

// ss is a process spawn and every card with an emulator asks on each poll; servers rarely come and go faster.
const SOCKETS_TTL_MS: number = 3000;

// Finds the Metro port of a chat that drives an emulator, so a phone can load the same app through the tunnel.
export class MetroLocator {
  private cached: { readonly at: number; readonly sockets: Promise<ListeningSocket[]> } | null = null;

  async portOf(sessionId: string): Promise<number | null> {
    const sessions: SessionRecord[] = await listLiveSessions().catch((): SessionRecord[] => []);
    const chat: SessionRecord | undefined = sessions.find((session: SessionRecord) => session.sessionId === sessionId);
    if (chat === undefined) return null;
    return metroPortOf(await this.sockets(), { pid: chat.pid, cwd: chat.cwd, home: homedir() }, procFacts);
  }

  private sockets(): Promise<ListeningSocket[]> {
    const now: number = Date.now();
    if (this.cached !== null && now - this.cached.at < SOCKETS_TTL_MS) return this.cached.sockets;
    const sockets: Promise<ListeningSocket[]> = runCommand('ss', ['-ltnpH'])
      .then(parseListeningSockets)
      .catch((): ListeningSocket[] => []);
    this.cached = { at: now, sockets };
    return sockets;
  }
}
