import { describe, expect, it } from 'vitest';
import { chatServers } from '../src/core/devices/dev-servers';
import type { ServerProcessFacts } from '../src/core/devices/dev-servers';
import type { ListeningSocket } from '../src/core/devices/listening-sockets';
import { serverKind } from '../src/core/devices/server-kind';

interface FakeProcess {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly session: string | null;
}

const MINE: string = 'chat-a';
const PROCESSES: ReadonlyMap<number, FakeProcess> = new Map([
  [10, { argv: ['node', '/r/.worktrees/search/apps/mobile/node_modules/.bin/expo', 'start', '--port', '8081'], cwd: '/r/.worktrees/search/apps/mobile', session: MINE }],
  [11, { argv: ['node', './node_modules/.bin/../vite/bin/vite.js', '--port', '3010'], cwd: '/r/.worktrees/search/apps/web', session: MINE }],
  [12, { argv: ['/r/api/.venv/bin/python', '-m', 'uvicorn', 'main:app'], cwd: '/r/api', session: MINE }],
  [13, { argv: ['/home/me/Android/Sdk/emulator/qemu/linux-x86_64/qemu-system-x86_64', '-avd', 'Pixel'], cwd: '/home/me', session: MINE }],
  [14, { argv: ['rootlessport'], cwd: '/r', session: MINE }],
  [20, { argv: ['node', 'vite.js'], cwd: '/other', session: 'chat-b' }],
  [30, { argv: ['node', 'mcp-server.js'], cwd: '/home/me', session: null }],
]);

const FACTS: ServerProcessFacts = {
  argv: (pid: number): Promise<readonly string[]> => Promise.resolve(PROCESSES.get(pid)?.argv ?? []),
  cwd: (pid: number): Promise<string | null> => Promise.resolve(PROCESSES.get(pid)?.cwd ?? null),
  sessionOf: (pid: number): Promise<string | null> => Promise.resolve(PROCESSES.get(pid)?.session ?? null),
};

const SOCKETS: ListeningSocket[] = [
  { port: 8081, pids: [10] },
  { port: 3010, pids: [11] },
  { port: 8000, pids: [12] },
  { port: 5554, pids: [13] },
  { port: 5555, pids: [13] },
  ...[4510, 4511, 4512, 4513, 4514].map((port: number): ListeningSocket => ({ port, pids: [14] })),
  { port: 3000, pids: [20] },
  { port: 3001, pids: [30] },
];

describe('chat servers', () => {
  it('lists the ports the chat\'s commands listen on, named by what runs and where', async () => {
    expect(await chatServers(SOCKETS, MINE, FACTS)).toEqual([
      { port: 3010, name: 'Vite · search' },
      { port: 8000, name: 'uvicorn · api' },
      { port: 8081, name: 'Metro · search' },
    ]);
  });

  it('leaves out other chats, MCP servers, emulators and container port ranges', async () => {
    const ports: number[] = (await chatServers(SOCKETS, MINE, FACTS)).map((server) => server.port);
    expect(ports).not.toContain(3000);
    expect(ports).not.toContain(3001);
    expect(ports).not.toContain(5554);
    expect(ports).not.toContain(4510);
  });

  it('names a server by its tool, else by the script an interpreter runs', () => {
    expect(serverKind(['node', '/x/node_modules/next/dist/bin/next', 'dev'])).toBe('Next.js');
    expect(serverKind(['python3', '-m', 'http.server', '4599'])).toBe('http.server');
    expect(serverKind(['node', 'server.js'])).toBe('server.js');
    expect(serverKind(['pasta', '--config-net'])).toBe('Container');
    expect(serverKind(['/usr/bin/caddy', 'run'])).toBe('caddy');
  });
});
