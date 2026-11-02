// A TCP port something listens on, with the processes holding it, as `ss -ltnpH` lists them.
export interface ListeningSocket {
  readonly port: number;
  readonly pids: readonly number[];
}

const LOCAL_ADDRESS_COLUMN: number = 3;
const PID_FIELD: RegExp = /pid=(\d+)/g;

// The same port shows once per address family (0.0.0.0 and [::]); one entry per port is enough.
export function parseListeningSockets(output: string): ListeningSocket[] {
  const byPort: Map<number, Set<number>> = new Map();
  for (const line of output.split('\n')) {
    const address: string | undefined = line.trim().split(/\s+/)[LOCAL_ADDRESS_COLUMN];
    const port: number = Number(address?.slice(address.lastIndexOf(':') + 1));
    if (address === undefined || !Number.isInteger(port) || port <= 0) continue;
    const pids: Set<number> = byPort.get(port) ?? new Set();
    for (const match of line.matchAll(PID_FIELD)) pids.add(Number(match[1]));
    byPort.set(port, pids);
  }
  return [...byPort].map(([port, pids]): ListeningSocket => ({ port, pids: [...pids] }));
}
