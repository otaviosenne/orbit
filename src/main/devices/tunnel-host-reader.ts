import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { TunnelHosts } from '../../core/devices/tunnel-hosts';
import { mergeTunnelHosts } from '../../core/devices/tunnel-hosts';

// The system tunnel (cloudflared as a service) and the user's own; the system one wins a port both publish.
const TUNNEL_CONFIGS: readonly string[] = ['/etc/cloudflared/config.yml', join(homedir(), '.cloudflared', 'config.yml')];
// The ingress changes by hand, rarely; the device buttons ask on every poll.
const TUNNEL_HOSTS_TTL_MS: number = 30_000;

export class TunnelHostReader {
  private cached: { readonly at: number; readonly hosts: Promise<TunnelHosts> } | null = null;

  hosts(): Promise<TunnelHosts> {
    const now: number = Date.now();
    if (this.cached !== null && now - this.cached.at < TUNNEL_HOSTS_TTL_MS) return this.cached.hosts;
    const hosts: Promise<TunnelHosts> = readConfigs();
    this.cached = { at: now, hosts };
    return hosts;
  }
}

// No tunnel at all is fine: every local page is then reported as not published.
async function readConfigs(): Promise<TunnelHosts> {
  const configs: string[] = await Promise.all(TUNNEL_CONFIGS.map((path: string) => readFile(path, 'utf8').catch((): string => '')));
  return mergeTunnelHosts(configs);
}
