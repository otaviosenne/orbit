import { describe, expect, it } from 'vitest';
import { parseListeningSockets } from '../src/core/devices/listening-sockets';
import type { ListeningSocket } from '../src/core/devices/listening-sockets';
import { NO_EMULATOR_PORTS, emulatorPorts, parseReverseRules } from '../src/core/devices/emulator-ports';
import type { EmulatorPorts } from '../src/core/devices/emulator-ports';
import { metroAppName } from '../src/core/devices/metro-app-name';
import { metroOf } from '../src/core/devices/metro-port';
import type { ChatProcess, ProcessFacts } from '../src/core/devices/metro-port';
import { isMetroCommand } from '../src/core/devices/metro-process';

const SS_OUTPUT: string = [
  'LISTEN 0      511             127.0.0.1:3000  0.0.0.0:* users:(("node",pid=300,fd=21))',
  'LISTEN 0      511               0.0.0.0:8081  0.0.0.0:* users:(("node",pid=400,fd=20))',
  'LISTEN 0      511                  [::]:8081     [::]:* users:(("node",pid=400,fd=22))',
  'LISTEN 0      511               0.0.0.0:8082  0.0.0.0:* users:(("node",pid=500,fd=20))',
  'LISTEN 0      200             127.0.0.1:5432  0.0.0.0:*',
].join('\n');

interface FakeProcess {
  readonly argv: readonly string[];
  readonly parent: number;
  readonly cwd: string;
}

const CHAT: ChatProcess = { pid: 100, cwd: '/home/me/app', home: '/home/me' };

// The chat (100) runs Vite (300) and Metro (400) from its shell (200); another terminal (900) runs a second Metro.
const PROCESSES: ReadonlyMap<number, FakeProcess> = new Map([
  [100, { argv: ['claude'], parent: 50, cwd: '/home/me/app' }],
  [200, { argv: ['bash', '-c', 'npx expo start'], parent: 100, cwd: '/home/me/app' }],
  [300, { argv: ['node', '/home/me/my-expo-app/node_modules/.bin/vite'], parent: 200, cwd: '/home/me/app/web' }],
  [400, { argv: ['node', '/home/me/app/node_modules/.bin/expo', 'start'], parent: 200, cwd: '/home/me/app' }],
  [500, { argv: ['node', '/home/me/app/node_modules/react-native/cli.js', 'start', '--port', '8082'], parent: 900, cwd: '/home/me/app/mobile' }],
  [600, { argv: ['node', '/home/me/app/.worktrees/search/node_modules/.bin/expo', 'start'], parent: 1, cwd: '/home/me/app/.worktrees/search/apps/mobile' }],
  [900, { argv: ['zsh'], parent: 1, cwd: '/home/me' }],
]);

const FACTS: ProcessFacts = {
  argv: (pid: number): Promise<readonly string[]> => Promise.resolve(PROCESSES.get(pid)?.argv ?? []),
  parentPid: (pid: number): Promise<number | null> => Promise.resolve(PROCESSES.get(pid)?.parent ?? null),
  cwd: (pid: number): Promise<string | null> => Promise.resolve(PROCESSES.get(pid)?.cwd ?? null),
};

describe('listening sockets', () => {
  it('lists each port once with its processes, and keeps one nobody may see', () => {
    const sockets: ListeningSocket[] = parseListeningSockets(SS_OUTPUT);
    expect(sockets).toEqual([
      { port: 3000, pids: [300] },
      { port: 8081, pids: [400] },
      { port: 8082, pids: [500] },
      { port: 5432, pids: [] },
    ]);
  });
});

describe('metro port', () => {
  const sockets: ListeningSocket[] = parseListeningSockets(SS_OUTPUT);

  it('tells Metro from other servers by whole path segments', () => {
    expect(isMetroCommand(['node', '/x/node_modules/.bin/expo', 'run:android'])).toBe(true);
    expect(isMetroCommand(['node', '/x/node_modules/@expo/cli/build/bin/cli', 'start'])).toBe(true);
    expect(isMetroCommand(['node', '/home/me/my-expo-app/node_modules/.bin/vite'])).toBe(false);
  });

  async function portOf(found: readonly ListeningSocket[], chat: ChatProcess = CHAT, emulator: EmulatorPorts = NO_EMULATOR_PORTS): Promise<number | null> {
    return (await metroOf(found, chat, FACTS, emulator))?.port ?? null;
  }

  it('prefers the Metro started from the chat\'s own shell', async () => {
    expect(await portOf(sockets)).toBe(8081);
    expect((await metroOf(sockets, CHAT, FACTS, NO_EMULATOR_PORTS))?.folder).toBe('/home/me/app');
  });

  it('falls back to the one Metro serving a folder inside the chat\'s folder', async () => {
    const withoutOwn: ListeningSocket[] = sockets.filter((socket: ListeningSocket) => socket.port !== 8081);
    expect(await portOf(withoutOwn)).toBe(8082);
  });

  it('does not guess between several Metros inside the chat\'s folder', async () => {
    const worktrees: ListeningSocket[] = [{ port: 8082, pids: [500] }, { port: 8083, pids: [600] }];
    expect(await portOf(worktrees)).toBeNull();
  });

  it('claims no Metro by folder for a chat opened in the home folder', async () => {
    const withoutOwn: ListeningSocket[] = sockets.filter((socket: ListeningSocket) => socket.port !== 8081);
    expect(await portOf(withoutOwn, { ...CHAT, cwd: '/home/me' })).toBeNull();
  });

  it('takes the Metro the emulator holds the most connections to over the chat\'s own', async () => {
    const all: ListeningSocket[] = [...sockets, { port: 8083, pids: [600] }];
    const emulator: EmulatorPorts = { connected: new Map([[8081, 1], [8083, 4]]), reversed: [] };
    expect(await portOf(all, CHAT, emulator)).toBe(8083);
  });

  it('takes a Metro the emulator reverses to before it connects', async () => {
    expect(await portOf(sockets, CHAT, { connected: new Map(), reversed: [8099, 8082] })).toBe(8082);
  });
});

describe('emulator ports', () => {
  // 10.0.2.2:8081 once (the dev launcher polling), 127.0.0.1:8095 twice through a reverse rule, one closed, one outside.
  const PROC_NET: string = [
    '  sl  local_address rem_address   st tx_queue',
    '   0: 1202000A:94D4 0202000A:1F91 01 00000000:00000000',
    '   1: 0000000000000000FFFF00001102000A:B4B2 0000000000000000FFFF00000100007F:1F9F 01 00000000:00000000',
    '   2: 0000000000000000FFFF00001102000A:B4B3 0000000000000000FFFF00000100007F:1F9F 01 00000000:00000000',
    '   3: 1202000A:94D5 0202000A:1F92 08 00000000:00000000',
    '   4: 1202000A:94D6 0473D9AC:01BB 01 00000000:00000000',
  ].join('\n');

  it('counts open connections per host port, through the host alias and reverse rules', () => {
    const reverse: ReadonlyMap<number, number> = parseReverseRules('host-16 tcp:8095 tcp:8095\nhost-16 tcp:8083 tcp:8083\n');
    const ports: EmulatorPorts = emulatorPorts(PROC_NET, reverse);
    expect([...ports.connected]).toEqual([[8081, 1], [8095, 2]]);
    expect(ports.reversed).toEqual([8095, 8083]);
  });

  it('names a Metro by its worktree, else by its folder', () => {
    expect(metroAppName('/r/.worktrees/search-phone/apps/mobile')).toBe('search-phone');
    expect(metroAppName('/home/me/app')).toBe('app');
    expect(metroAppName(null)).toBeNull();
  });
});
