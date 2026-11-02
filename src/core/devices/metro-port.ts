import type { ListeningSocket } from './listening-sockets';
import { isMetroCommand } from './metro-process';

// What the port search needs to know about a process; read from /proc in the app, made up in tests.
export interface ProcessFacts {
  argv(pid: number): Promise<readonly string[]>;
  parentPid(pid: number): Promise<number | null>;
  cwd(pid: number): Promise<string | null>;
}

export interface ChatProcess {
  readonly pid: number;
  readonly cwd: string;
  // A chat opened in the home folder would claim every Metro on the machine by folder; it only counts by descent.
  readonly home: string;
}

// Deep enough for npm -> sh -> node chains under a background shell; a cycle or a reparented orphan ends sooner.
const MAX_ANCESTRY: number = 32;
const INIT_PID: number = 1;

// The port of the Metro this chat runs: one started from the chat's own shell first, else one serving a folder inside
// the chat's folder (started from another terminal). The lowest port wins when a chat runs several.
export async function metroPortOf(sockets: readonly ListeningSocket[], chat: ChatProcess, facts: ProcessFacts): Promise<number | null> {
  const metro: MetroSocket[] = await metroSockets(sockets, facts);
  const started: number[] = await portsWhere(metro, (pid: number) => descendsFrom(pid, chat.pid, facts));
  if (started.length > 0) return Math.min(...started);
  if (chat.cwd === chat.home) return null;
  const served: number[] = await portsWhere(metro, async (pid: number) => isInside(await facts.cwd(pid), chat.cwd));
  return served.length > 0 ? Math.min(...served) : null;
}

interface MetroSocket {
  readonly port: number;
  readonly pid: number;
}

async function metroSockets(sockets: readonly ListeningSocket[], facts: ProcessFacts): Promise<MetroSocket[]> {
  const pairs: MetroSocket[] = sockets.flatMap((socket: ListeningSocket) => socket.pids.map((pid: number): MetroSocket => ({ port: socket.port, pid })));
  const checks: boolean[] = await Promise.all(pairs.map(async (pair: MetroSocket) => isMetroCommand(await facts.argv(pair.pid))));
  return pairs.filter((_pair: MetroSocket, index: number) => checks[index] === true);
}

async function portsWhere(metro: readonly MetroSocket[], test: (pid: number) => Promise<boolean>): Promise<number[]> {
  const checks: boolean[] = await Promise.all(metro.map((socket: MetroSocket) => test(socket.pid)));
  return metro.filter((_socket: MetroSocket, index: number) => checks[index] === true).map((socket: MetroSocket) => socket.port);
}

async function descendsFrom(pid: number, ancestor: number, facts: ProcessFacts): Promise<boolean> {
  let current: number | null = pid;
  for (let step: number = 0; step < MAX_ANCESTRY && current !== null && current > INIT_PID; step++) {
    if (current === ancestor) return true;
    current = await facts.parentPid(current);
  }
  return false;
}

function isInside(folder: string | null, root: string): boolean {
  return folder !== null && (folder === root || folder.startsWith(`${root}/`));
}
