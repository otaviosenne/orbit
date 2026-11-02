import type { TunnelHosts } from './tunnel-hosts';

const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);
const LOCAL_SUFFIX: string = '.localhost';
const DEFAULT_PORTS: Readonly<Record<string, number>> = { 'http:': 80, 'https:': 443 };

// The address a phone can open for a page the computer's browser shows: a page on this computer's own port becomes
// its tunnel address, any other web page stays as it is. null when the page is local and its port is not published.
export function publicUrlOf(url: string | null, hosts: TunnelHosts): string | null {
  const parsed: URL | null = parseUrl(url);
  const defaultPort: number | undefined = parsed === null ? undefined : DEFAULT_PORTS[parsed.protocol];
  if (parsed === null || defaultPort === undefined) return null;
  if (!isLocalHost(parsed.hostname)) return parsed.href;
  const address: string | undefined = hosts.get(parsed.port === '' ? defaultPort : Number(parsed.port));
  return address === undefined ? null : `${address}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith(LOCAL_SUFFIX);
}

function parseUrl(url: string | null): URL | null {
  if (url === null) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
