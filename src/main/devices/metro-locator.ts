import { homedir } from 'node:os';
import type { EmulatorPorts } from '../../core/devices/emulator-ports';
import type { ListeningSocket } from '../../core/devices/listening-sockets';
import { metroOf } from '../../core/devices/metro-port';
import type { MetroServer } from '../../core/devices/metro-port';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { EmulatorPortReader } from './emulator-port-reader';
import type { ListeningSocketReader } from './listening-socket-reader';
import { procFacts } from './proc-facts';

// Finds the Metro behind a chat's emulator, so a phone can load the same app through the tunnel.
export class MetroLocator {
  private readonly emulators: EmulatorPortReader = new EmulatorPortReader();

  constructor(private readonly sockets: ListeningSocketReader) {}

  async serverOf(sessionId: string, emulatorConsolePort: number): Promise<MetroServer | null> {
    const sessions: SessionRecord[] = await listLiveSessions().catch((): SessionRecord[] => []);
    const chat: SessionRecord | undefined = sessions.find((session: SessionRecord) => session.sessionId === sessionId);
    if (chat === undefined) return null;
    const [sockets, emulator]: [ListeningSocket[], EmulatorPorts] = await Promise.all([this.sockets.sockets(), this.emulators.portsOf(emulatorConsolePort)]);
    return metroOf(sockets, { pid: chat.pid, cwd: chat.cwd, home: homedir() }, procFacts, emulator);
  }
}
