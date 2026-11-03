import type { ServerLink } from '../../shared/types';

// What a server's row copies: the tunnel address a phone opens, else the local one, which works on the computer only.
export function serverAddress(server: ServerLink): string {
  return server.publicUrl ?? `http://localhost:${server.port}`;
}

// The tooltip of the servers button: each port with what runs there, then the address to open it at.
export function serverLines(servers: readonly ServerLink[]): string[] {
  return servers.flatMap((server: ServerLink): string[] => [`${server.port} · ${server.name}`, `   ${server.publicUrl ?? 'not on the tunnel'}`]);
}

export function sameServers(a: readonly ServerLink[], b: readonly ServerLink[]): boolean {
  return a.length === b.length && a.every((server: ServerLink, index: number) => {
    const other: ServerLink | undefined = b[index];
    return other !== undefined && server.port === other.port && server.name === other.name && server.publicUrl === other.publicUrl;
  });
}
