const LOCAL_HOSTNAMES: readonly string[] = ['127.0.0.1', 'localhost'];

export interface TrustedOrigins {
  // Host headers this server answers to; anything else is a DNS-rebinding page or a misrouted proxy.
  readonly hosts: ReadonlySet<string>;
  // Origin headers a state-changing request may carry: the local address and the user's external URL.
  readonly origins: ReadonlySet<string>;
}

export function trustedOrigins(port: number, externalUrl: string): TrustedOrigins {
  const hosts: Set<string> = new Set(LOCAL_HOSTNAMES.map((name: string) => `${name}:${port}`));
  const origins: Set<string> = new Set(LOCAL_HOSTNAMES.map((name: string) => `http://${name}:${port}`));
  if (externalUrl.length > 0) {
    const external: URL = new URL(externalUrl);
    hosts.add(external.host);
    origins.add(external.origin);
  }
  return { hosts, origins };
}

export function isTrustedHost(trusted: TrustedOrigins, host: string | undefined): boolean {
  return host !== undefined && trusted.hosts.has(host.toLowerCase());
}

export function isTrustedOrigin(trusted: TrustedOrigins, origin: string | undefined): boolean {
  return origin !== undefined && trusted.origins.has(origin);
}
