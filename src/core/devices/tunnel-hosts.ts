// The local ports a Cloudflare Tunnel publishes, each with the https address the world reaches it at. Read from the
// tunnel's own ingress rules, so Orbit only offers addresses that really answer.
export type TunnelHosts = ReadonlyMap<number, string>;

const HOSTNAME_LINE: RegExp = /^\s*(?:-\s*)?hostname:\s*["']?([A-Za-z0-9.-]+)/;
const SERVICE_LINE: RegExp = /^\s*(?:-\s*)?service:\s*["']?https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)/;
// A new rule starts with "- "; a service without a hostname in the same rule is the catch-all, not a published port.
const RULE_START: RegExp = /^\s*-\s/;

export function parseTunnelHosts(config: string): Map<number, string> {
  const hosts: Map<number, string> = new Map();
  let hostname: string | null = null;
  for (const line of config.split('\n')) {
    if (RULE_START.test(line)) hostname = null;
    hostname = HOSTNAME_LINE.exec(line)?.[1] ?? hostname;
    const port: string | undefined = SERVICE_LINE.exec(line)?.[1];
    if (port !== undefined && hostname !== null) offer(hosts, Number(port), hostname);
  }
  return hosts;
}

export function mergeTunnelHosts(configs: readonly string[]): Map<number, string> {
  const merged: Map<number, string> = new Map();
  for (const config of configs) {
    for (const [port, address] of parseTunnelHosts(config)) if (!merged.has(port)) merged.set(port, address);
  }
  return merged;
}

// A port published under several names keeps the one named after it (3000.example.com over app.example.com):
// that is the address meant for "whatever runs on this port".
function offer(hosts: Map<number, string>, port: number, hostname: string): void {
  const isNamedAfterPort: boolean = hostname.split('.')[0] === String(port);
  if (!hosts.has(port) || isNamedAfterPort) hosts.set(port, `https://${hostname}`);
}
