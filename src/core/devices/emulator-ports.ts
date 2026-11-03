// The host ports an emulator's apps talk to: the strongest sign of which Metro its dev client loaded, since a chat's
// folder may hold several worktrees with a Metro each.
export interface EmulatorPorts {
  // Open connections per host port; a loaded app holds several (bundle, HMR, inspector) at once.
  readonly connected: ReadonlyMap<number, number>;
  // Host ports `adb reverse` forwards to, which point the dev client at a Metro before it connects.
  readonly reversed: readonly number[];
}

export const NO_EMULATOR_PORTS: EmulatorPorts = { connected: new Map(), reversed: [] };

const HEX: number = 16;
const STATE_COLUMN: number = 3;
const REMOTE_COLUMN: number = 2;
const ESTABLISHED: string = '01';
// IPv4 addresses in /proc/net/tcp are little-endian hex; tcp6 holds them v4-mapped, so the last 8 digits match too.
const IPV4_DIGITS: number = 8;
// 10.0.2.2 is the emulator's alias for the host's loopback.
const HOST_ALIAS: string = '0202000A';
// 127.0.0.1 inside the emulator reaches the host only through an `adb reverse` rule.
const LOOPBACK: string = '0100007F';
// `adb reverse --list` prints "<serial> tcp:<device port> tcp:<host port>".
const REVERSE_RULE: RegExp = /tcp:(\d+)\s+tcp:(\d+)/;

export function parseReverseRules(output: string): ReadonlyMap<number, number> {
  const rules: Map<number, number> = new Map();
  for (const line of output.split('\n')) {
    const match: RegExpExecArray | null = REVERSE_RULE.exec(line);
    if (match !== null) rules.set(Number(match[1]), Number(match[2]));
  }
  return rules;
}

// `procNet` is /proc/net/tcp and tcp6 read inside the emulator.
export function emulatorPorts(procNet: string, reverse: ReadonlyMap<number, number>): EmulatorPorts {
  const connected: Map<number, number> = new Map();
  for (const line of procNet.split('\n')) {
    const port: number | null = hostPortOf(line.trim().split(/\s+/), reverse);
    if (port !== null) connected.set(port, (connected.get(port) ?? 0) + 1);
  }
  return { connected, reversed: [...reverse.values()] };
}

function hostPortOf(columns: readonly string[], reverse: ReadonlyMap<number, number>): number | null {
  const remote: string | undefined = columns[REMOTE_COLUMN];
  if (columns[STATE_COLUMN] !== ESTABLISHED || remote === undefined) return null;
  const [address, portHex]: string[] = remote.split(':');
  if (address === undefined || portHex === undefined) return null;
  const port: number = parseInt(portHex, HEX);
  const ipv4: string = address.slice(-IPV4_DIGITS).toUpperCase();
  if (ipv4 === HOST_ALIAS) return port;
  if (ipv4 === LOOPBACK) return reverse.get(port) ?? null;
  return null;
}
