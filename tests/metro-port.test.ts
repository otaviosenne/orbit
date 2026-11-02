import { describe, expect, it } from 'vitest';
import { parseListeningSockets } from '../src/core/devices/listening-sockets';
import type { ListeningSocket } from '../src/core/devices/listening-sockets';
import { metroPortOf } from '../src/core/devices/metro-port';
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

  it('prefers the Metro started from the chat\'s own shell', async () => {
    expect(await metroPortOf(sockets, CHAT, FACTS)).toBe(8081);
  });

  it('falls back to a Metro serving a folder inside the chat\'s folder', async () => {
    const withoutOwn: ListeningSocket[] = sockets.filter((socket: ListeningSocket) => socket.port !== 8081);
    expect(await metroPortOf(withoutOwn, CHAT, FACTS)).toBe(8082);
  });

  it('claims no Metro by folder for a chat opened in the home folder', async () => {
    const withoutOwn: ListeningSocket[] = sockets.filter((socket: ListeningSocket) => socket.port !== 8081);
    expect(await metroPortOf(withoutOwn, { ...CHAT, cwd: '/home/me' }, FACTS)).toBeNull();
  });
});
