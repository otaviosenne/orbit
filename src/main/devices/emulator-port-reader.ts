import type { EmulatorPorts } from '../../core/devices/emulator-ports';
import { NO_EMULATOR_PORTS, emulatorPorts, parseReverseRules } from '../../core/devices/emulator-ports';
import { runCommand } from '../run-command';
import { adbPath } from './adb-path';

// Two adb spawns per emulator, asked by every card with one on each poll; connections settle slower than that.
const PORTS_TTL_MS: number = 3000;
const PROC_NET_FILES: readonly string[] = ['/proc/net/tcp', '/proc/net/tcp6'];

interface CachedPorts {
  readonly at: number;
  readonly ports: Promise<EmulatorPorts>;
}

// Asks an emulator, by its console port, which host ports its apps use. An emulator adb cannot reach answers none,
// and the Metro is then found from the chat's processes instead.
export class EmulatorPortReader {
  private readonly cache: Map<number, CachedPorts> = new Map();

  portsOf(consolePort: number): Promise<EmulatorPorts> {
    const now: number = Date.now();
    const cached: CachedPorts | undefined = this.cache.get(consolePort);
    if (cached !== undefined && now - cached.at < PORTS_TTL_MS) return cached.ports;
    const ports: Promise<EmulatorPorts> = read(`emulator-${consolePort}`).catch((): EmulatorPorts => NO_EMULATOR_PORTS);
    this.cache.set(consolePort, { at: now, ports });
    return ports;
  }
}

async function read(serial: string): Promise<EmulatorPorts> {
  const [reverse, procNet]: [string, string] = await Promise.all([
    runCommand(adbPath(), ['-s', serial, 'reverse', '--list']).catch((): string => ''),
    runCommand(adbPath(), ['-s', serial, 'shell', 'cat', ...PROC_NET_FILES]),
  ]);
  return emulatorPorts(procNet, parseReverseRules(reverse));
}
