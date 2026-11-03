import type { ListeningSocket } from './listening-sockets';
import { metroAppName } from './metro-app-name';
import { serverKind } from './server-kind';

// What the server search needs to know about a process; read from /proc in the app, made up in tests.
export interface ServerProcessFacts {
  argv(pid: number): Promise<readonly string[]>;
  cwd(pid: number): Promise<string | null>;
  // The chat a process was started from: Claude Code puts its session id in the environment of every command it
  // runs, which the process keeps after its shell is gone. Null for anything else (MCP servers included).
  sessionOf(pid: number): Promise<string | null>;
}

// A port a chat's command listens on, named so it can be told apart from the chat's other servers.
export interface ChatServer {
  readonly port: number;
  // "Metro · search-phone": what runs, and the worktree or folder it serves.
  readonly name: string;
}

// An emulator listens on its console and adb ports, and on a few gRPC ones: none is a page to open.
const NOT_SERVERS: readonly string[] = ['qemu-system', 'emulator', 'adb'];
// One process holding more ports than this forwards a range (a container's), which nobody opens one by one.
const MAX_PORTS_PER_SERVER: number = 4;

// The chat's servers, lowest port first, one entry per port.
export async function chatServers(sockets: readonly ListeningSocket[], sessionId: string, facts: ServerProcessFacts): Promise<ChatServer[]> {
  const portsByPid: Map<number, number[]> = new Map();
  for (const socket of sockets) for (const pid of socket.pids) portsByPid.set(pid, [...(portsByPid.get(pid) ?? []), socket.port]);
  const found: ChatServer[][] = await Promise.all([...portsByPid].map(([pid, ports]) => serversOf(pid, ports, sessionId, facts)));
  const byPort: Map<number, ChatServer> = new Map(found.flat().map((server: ChatServer): [number, ChatServer] => [server.port, server]));
  return [...byPort.values()].sort((a: ChatServer, b: ChatServer) => a.port - b.port);
}

async function serversOf(pid: number, ports: readonly number[], sessionId: string, facts: ServerProcessFacts): Promise<ChatServer[]> {
  if (ports.length > MAX_PORTS_PER_SERVER || (await facts.sessionOf(pid)) !== sessionId) return [];
  const argv: readonly string[] = await facts.argv(pid);
  if (argv.some((arg: string) => NOT_SERVERS.some((name: string) => arg.split('/').some((segment: string) => segment.startsWith(name))))) return [];
  const app: string | null = metroAppName(await facts.cwd(pid));
  const name: string = app === null ? serverKind(argv) : `${serverKind(argv)} · ${app}`;
  return ports.map((port: number): ChatServer => ({ port, name }));
}
