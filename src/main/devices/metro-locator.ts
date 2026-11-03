import { homedir } from 'node:os';
import type { EmulatorPorts } from '../../core/devices/emulator-ports';
import type { ListeningSocket } from '../../core/devices/listening-sockets';
import { parseListeningSockets } from '../../core/devices/listening-sockets';
import { metroOf } from '../../core/devices/metro-port';
import type { MetroServer } from '../../core/devices/metro-port';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { runCommand } from '../run-command';
import { EmulatorPortReader } from './emulator-port-reader';
import { procFacts } from './proc-facts';

// ss is a process spawn and every card with an emulator asks on each poll; servers rarely come and go faster.
const SOCKETS_TTL_MS: number = 3000;

// Finds the Metro behind a chat's emulator, so a phone can load the same app through the tunnel.
export class MetroLocator {
  private cached: { readonly at: number; readonly sockets: Promise<ListeningSocket[]> } | null = null;
  private readonly emulators: EmulatorPortReader = new EmulatorPortReader();

  async serverOf(sessionId: string, emulatorConsolePort: number): Promise<MetroServer | null> {
    const sessions: SessionRecord[] = await listLiveSessions().catch((): SessionRecord[] => []);
    const chat: SessionRecord | undefined = sessions.find((session: SessionRecord) => session.sessionId === sessionId);
    if (chat === undefined) return null;
    const [sockets, emulator]: [ListeningSocket[], EmulatorPorts] = await Promise.all([this.sockets(), this.emulators.portsOf(emulatorConsolePort)]);
    return metroOf(sockets, { pid: chat.pid, cwd: chat.cwd, home: homedir() }, procFacts, emulator);
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
