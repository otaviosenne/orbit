import type { EmulatorPorts } from './emulator-ports';
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

// The Metro a chat's emulator runs, and the folder it serves (null when it cannot be read).
export interface MetroServer {
  readonly port: number;
  readonly folder: string | null;
}

// The Metro the chat's emulator actually talks to first; else one started from the chat's own shell; else the only
// one serving a folder inside the chat's folder. Several there (worktrees of one repo) is a guess Orbit won't make.
export async function metroOf(sockets: readonly ListeningSocket[], chat: ChatProcess, facts: ProcessFacts, emulator: EmulatorPorts): Promise<MetroServer | null> {
  const metro: MetroSocket[] = await metroSockets(sockets, facts);
  const chosen: MetroSocket | null = usedByEmulator(metro, emulator) ?? (await startedByChat(metro, chat, facts)) ?? (await servedInside(metro, chat, facts));
  return chosen === null ? null : { port: chosen.port, folder: await facts.cwd(chosen.pid) };
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

// The dev launcher also polls the default port, so the Metro with the most open connections is the loaded one.
function usedByEmulator(metro: readonly MetroSocket[], emulator: EmulatorPorts): MetroSocket | null {
  const connected: MetroSocket[] = metro.filter((socket: MetroSocket) => emulator.connected.has(socket.port));
  if (connected.length > 0) return connected.reduce((best: MetroSocket, socket: MetroSocket) => (isBusier(socket, best, emulator) ? socket : best));
  return lowestPort(metro.filter((socket: MetroSocket) => emulator.reversed.includes(socket.port)));
}

function isBusier(socket: MetroSocket, best: MetroSocket, emulator: EmulatorPorts): boolean {
  const difference: number = (emulator.connected.get(socket.port) ?? 0) - (emulator.connected.get(best.port) ?? 0);
  return difference > 0 || (difference === 0 && socket.port < best.port);
}

async function startedByChat(metro: readonly MetroSocket[], chat: ChatProcess, facts: ProcessFacts): Promise<MetroSocket | null> {
  return lowestPort(await socketsWhere(metro, (pid: number) => descendsFrom(pid, chat.pid, facts)));
}

async function servedInside(metro: readonly MetroSocket[], chat: ChatProcess, facts: ProcessFacts): Promise<MetroSocket | null> {
  if (chat.cwd === chat.home) return null;
  const inside: MetroSocket[] = await socketsWhere(metro, async (pid: number) => isInside(await facts.cwd(pid), chat.cwd));
  return new Set(inside.map((socket: MetroSocket) => socket.port)).size === 1 ? (inside[0] ?? null) : null;
}

function lowestPort(metro: readonly MetroSocket[]): MetroSocket | null {
  return metro.reduce((best: MetroSocket | null, socket: MetroSocket) => (best === null || socket.port < best.port ? socket : best), null);
}

async function socketsWhere(metro: readonly MetroSocket[], test: (pid: number) => Promise<boolean>): Promise<MetroSocket[]> {
  const checks: boolean[] = await Promise.all(metro.map((socket: MetroSocket) => test(socket.pid)));
  return metro.filter((_socket: MetroSocket, index: number) => checks[index] === true);
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
